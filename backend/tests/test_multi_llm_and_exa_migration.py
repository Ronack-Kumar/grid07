from __future__ import annotations

import asyncio
import json
import pytest
import httpx

from app.services.llm.router import (
    GroqProvider,
    GeminiProvider,
    OpenAICompatibleProvider,
    LLMRouter,
    LLMRequest,
    LLMResponse,
    LLMError,
)
from app.services.retrieval.search import (
    ExaSearchProvider,
    TavilySearchProvider,
    RetrievalService,
    SearchCache,
    SearchError,
    SearchOutcome,
    MockSearchProvider,
)
from app.services.agents.orchestration import AgentExecutionGraph


async def _fast_sleep(sec):
    return


# ─────────────────────────────────────────────────────────────────────────────
# 1. LLM Provider Tests (Mocked responses)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_gemini_generation_success(monkeypatch):
    gemini = GeminiProvider(api_key="AIzaSyFakeGeminiKeyForMockTesting", models=["gemini-2.0-flash"], timeout=5.0)

    async def mock_post(url, *args, **kwargs):
        assert "key=AIzaSyFakeGeminiKeyForMockTesting" in str(url) or kwargs.get("params", {}).get("key") == "AIzaSyFakeGeminiKeyForMockTesting"
        req = httpx.Request("POST", str(url))
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": "Gemini generated answer."}],
                            "role": "model",
                        },
                        "finishReason": "STOP",
                    }
                ],
                "usageMetadata": {"promptTokenCount": 15, "candidatesTokenCount": 10},
            },
            request=req,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    req = LLMRequest(
        provider="gemini",
        model="gemini-2.0-flash",
        system_prompt="You are a financial analyst.",
        user_prompt="Analyze dividend payout ratio.",
    )
    res = await gemini.generate(req)
    assert res.content == "Gemini generated answer."
    assert res.provider == "gemini"
    assert res.model == "gemini-2.0-flash"


@pytest.mark.asyncio
async def test_gemini_authentication_error_normalized(monkeypatch):
    gemini = GeminiProvider(api_key="invalid_gemini_key", models=["gemini-2.0-flash"], timeout=5.0)

    async def mock_post_auth_err(url, *args, **kwargs):
        req = httpx.Request("POST", str(url))
        return httpx.Response(
            400,
            json={
                "error": {
                    "code": 400,
                    "message": "API key not valid. Please pass a valid API key.",
                    "status": "INVALID_ARGUMENT",
                    "details": [{"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "API_KEY_INVALID"}],
                }
            },
            request=req,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post_auth_err)

    req = LLMRequest(provider="gemini", model="gemini-2.0-flash", system_prompt="Sys", user_prompt="User")
    with pytest.raises(LLMError) as exc_info:
        await gemini.generate(req)
    assert exc_info.value.category == "authentication"
    assert "Invalid or unconfigured credentials" in exc_info.value.safe_message


@pytest.mark.asyncio
async def test_gemini_rate_limit_and_quota_errors(monkeypatch):
    gemini = GeminiProvider(api_key="valid_key", models=["gemini-2.0-flash"], timeout=5.0)

    async def mock_post_429(url, *args, **kwargs):
        req = httpx.Request("POST", str(url))
        return httpx.Response(
            429,
            json={
                "error": {
                    "code": 429,
                    "message": "Resource has been exhausted (e.g. check quota).",
                    "status": "RESOURCE_EXHAUSTED",
                    "details": [{"reason": "RESOURCE_EXHAUSTED"}],
                }
            },
            request=req,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post_429)

    req = LLMRequest(provider="gemini", model="gemini-2.0-flash", system_prompt="Sys", user_prompt="User")
    with pytest.raises(LLMError) as exc_info:
        await gemini.generate(req)
    assert exc_info.value.category == "rate_limit"


@pytest.mark.asyncio
async def test_openrouter_generation_and_auth_error(monkeypatch):
    openrouter = OpenAICompatibleProvider(
        name="openrouter",
        api_key="sk-or-fake-key",
        base_url="https://openrouter.ai/api/v1",
        models=["meta-llama/llama-3.3-70b-instruct:free"],
        timeout=5.0,
    )

    # Success case
    async def mock_post_success(url, *args, **kwargs):
        req = httpx.Request("POST", str(url))
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"role": "assistant", "content": "OpenRouter response."}}],
                "usage": {"total_tokens": 42},
            },
            request=req,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post_success)
    req = LLMRequest(provider="openrouter", model="meta-llama/llama-3.3-70b-instruct:free", system_prompt="Sys", user_prompt="User")
    res = await openrouter.generate(req)
    assert res.content == "OpenRouter response."
    assert res.provider == "openrouter"

    # 401 Auth error
    async def mock_post_401(url, *args, **kwargs):
        req = httpx.Request("POST", str(url))
        return httpx.Response(401, json={"error": {"code": 401, "message": "User key not found"}}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post_401)
    with pytest.raises(LLMError) as exc_info:
        await openrouter.generate(req)
    assert exc_info.value.category == "authentication"


@pytest.mark.asyncio
async def test_missing_provider_api_key_disables_cleanly():
    gemini = GeminiProvider(api_key="", models=["gemini-2.0-flash"], timeout=5.0)
    assert not gemini.configured

    openrouter = OpenAICompatibleProvider(
        name="openrouter", api_key="", base_url="https://openrouter.ai/api/v1", models=[], timeout=5.0
    )
    assert not openrouter.configured

    router = LLMRouter({"gemini": gemini, "openrouter": openrouter})
    with pytest.raises(LLMError) as exc_info:
        await router.generate(LLMRequest(provider="gemini", model="gemini-2.0-flash", system_prompt="Sys", user_prompt="User"))
    assert exc_info.value.category == "configuration"


# ─────────────────────────────────────────────────────────────────────────────
# 2. Exa and Tavily Search Tests (Mocked responses)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_exa_successful_search(monkeypatch):
    provider = ExaSearchProvider(api_key="fake-exa-key", max_results=3, timeout=5.0)

    async def mock_post(url, *args, **kwargs):
        assert kwargs["headers"]["x-api-key"] == "fake-exa-key"
        req = httpx.Request("POST", str(url))
        return httpx.Response(
            200,
            json={
                "results": [
                    {
                        "title": "Current Petrol Prices in New Delhi",
                        "url": "https://fuel.example.com/delhi-petrol",
                        "highlights": ["Petrol in New Delhi is currently retailing at ₹94.72 per liter."],
                        "text": "Full text about Delhi petroleum retail pricing...",
                        "publishedDate": "2026-10-24T06:00:00Z",
                    },
                    {
                        "title": "National Gold Rate 24K Live Update",
                        "url": "https://gold.example.com/live-rate",
                        "highlights": ["24K gold stands at ₹78,500 per 10 grams today."],
                        "text": "Bullion market analysis today...",
                        "publishedDate": "2026-10-24T08:30:00Z",
                    },
                ]
            },
            request=req,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    results = await provider.search("current petrol price today")
    assert len(results) == 2
    first = results[0]
    assert first["title"] == "Current Petrol Prices in New Delhi"
    assert first["url"] == "https://fuel.example.com/delhi-petrol"
    assert "₹94.72" in first["content"]
    assert first["published_date"] == "2026-10-24T06:00:00Z"
    assert first["provider"] == "exa"


@pytest.mark.asyncio
async def test_exa_empty_and_malformed_results(monkeypatch):
    provider = ExaSearchProvider(api_key="fake-exa-key", max_results=3, timeout=5.0)

    # Empty results
    async def mock_empty(url, *args, **kwargs):
        req = httpx.Request("POST", str(url))
        return httpx.Response(200, json={"results": []}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_empty)
    empty_res = await provider.search("obscure impossible query")
    assert empty_res == []

    # Malformed results (e.g. invalid URLs, null titles)
    async def mock_malformed(url, *args, **kwargs):
        req = httpx.Request("POST", str(url))
        return httpx.Response(
            200,
            json={
                "results": [
                    {"title": "", "url": "not-a-valid-url", "highlights": []},
                    {"title": "Valid Source", "url": "https://valid.example.com", "highlights": ["Good snippet"]},
                    {"non_dict": "corrupt"},
                ]
            },
            request=req,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_malformed)
    res = await provider.search("test")
    assert len(res) == 1
    assert res[0]["url"] == "https://valid.example.com"


@pytest.mark.asyncio
async def test_exa_error_normalization(monkeypatch):
    provider = ExaSearchProvider(api_key="fake-exa-key", max_results=3, timeout=5.0)

    # 401 Auth
    async def mock_401(url, *args, **kwargs):
        req = httpx.Request("POST", str(url))
        return httpx.Response(401, json={"error": "Unauthorized"}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_401)
    with pytest.raises(SearchError) as exc_info:
        await provider.search("query")
    assert exc_info.value.category == "authentication"
    assert exc_info.value.retryable is False

    # 429 Rate Limit
    async def mock_429(url, *args, **kwargs):
        req = httpx.Request("POST", str(url))
        return httpx.Response(429, json={"error": "Rate limit"}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_429)
    with pytest.raises(SearchError) as exc_info:
        await provider.search("query")
    assert exc_info.value.category == "rate_limit"


@pytest.mark.asyncio
async def test_tavily_successful_search_and_error(monkeypatch):
    tavily = TavilySearchProvider(api_key="tvly-fake-key", max_results=2, timeout=5.0)

    # Success
    async def mock_tavily_success(url, *args, **kwargs):
        assert kwargs["headers"]["Authorization"] == "Bearer tvly-fake-key"
        req = httpx.Request("POST", str(url))
        return httpx.Response(
            200,
            json={
                "results": [
                    {
                        "title": "Silver Spot Price Realtime",
                        "url": "https://silver.example.com/spot",
                        "content": "Silver is trading at $31.50 per ounce.",
                        "published_date": "2026-10-24",
                    }
                ]
            },
            request=req,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_tavily_success)
    results = await tavily.search("silver price today")
    assert len(results) == 1
    assert results[0]["provider"] == "tavily"
    assert "$31.50" in results[0]["content"]

    # 401 Error
    async def mock_tavily_401(url, *args, **kwargs):
        req = httpx.Request("POST", str(url))
        return httpx.Response(401, json={"error": "Invalid API key"}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_tavily_401)
    with pytest.raises(SearchError) as exc_info:
        await tavily.search("query")
    assert exc_info.value.category == "authentication"


@pytest.mark.asyncio
async def test_exa_to_tavily_fallback_policy(monkeypatch):
    """
    When Exa fails with a recoverable error (or server 500), Tavily should seamlessly handle the search.
    """
    exa = ExaSearchProvider(api_key="exa-key", max_results=3, timeout=5.0)
    tavily = TavilySearchProvider(api_key="tavily-key", max_results=3, timeout=5.0)

    monkeypatch.setattr(asyncio, "sleep", _fast_sleep)

    cache = SearchCache()
    service = RetrievalService(search_provider=exa, fallback_provider=tavily, cache=cache)

    async def mock_post(*args, **kwargs):
        url_str = ""
        for a in args:
            if isinstance(a, (str, httpx.URL)):
                url_str = str(a)
                break
        if not url_str:
            url_str = str(kwargs.get("url", ""))

        req = httpx.Request("POST", url_str)
        if "exa.ai" in url_str:
            # Exa fails with 500
            return httpx.Response(500, json={"error": "Internal Server Error"}, request=req)
        elif "tavily.com" in url_str:
            # Tavily succeeds
            return httpx.Response(
                200,
                json={
                    "results": [
                        {
                            "title": "USD to INR Exchange Rate Today",
                            "url": "https://forex.example.com/usd-inr",
                            "content": "1 USD is currently trading at ₹84.15.",
                            "published_date": "2026-10-24",
                        }
                    ]
                },
                request=req,
            )
        raise ValueError(f"Unexpected url {url_str}")

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    outcome = await service.retrieve("USD to INR exchange rate today", domain="finance")
    assert outcome.status == "completed"
    assert outcome.provider == "tavily"
    assert outcome.fallback_used is True
    assert len(outcome.results) == 1
    assert "₹84.15" in outcome.results[0]["content"]


@pytest.mark.asyncio
async def test_tavily_only_operation_when_exa_unconfigured(monkeypatch):
    """
    When Exa has no key configured, Tavily operates as the primary search provider.
    """
    exa = ExaSearchProvider(api_key="", max_results=3, timeout=5.0)
    tavily = TavilySearchProvider(api_key="tavily-key", max_results=3, timeout=5.0)

    monkeypatch.setattr(asyncio, "sleep", _fast_sleep)
    service = RetrievalService(search_provider=exa, fallback_provider=tavily, cache=SearchCache())

    async def mock_post(*args, **kwargs):
        url_str = ""
        for a in args:
            if isinstance(a, (str, httpx.URL)):
                url_str = str(a)
                break
        if not url_str:
            url_str = str(kwargs.get("url", ""))

        req = httpx.Request("POST", url_str)
        assert "tavily.com" in url_str
        return httpx.Response(
            200,
            json={
                "results": [
                    {
                        "title": "Gold Rate Today",
                        "url": "https://gold.example.com",
                        "content": "Gold rates in Mumbai.",
                    }
                ]
            },
            request=req,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    outcome = await service.retrieve("gold rate today", domain="finance")
    assert outcome.status == "completed"
    assert outcome.provider == "tavily"
    assert outcome.fallback_used is False


@pytest.mark.asyncio
async def test_both_search_providers_unavailable_reports_error(monkeypatch):
    """
    When both Exa and Tavily fail, the outcome reports the error transparently.
    """
    exa = ExaSearchProvider(api_key="exa-key", max_results=3, timeout=5.0)
    tavily = TavilySearchProvider(api_key="tavily-key", max_results=3, timeout=5.0)

    monkeypatch.setattr(asyncio, "sleep", _fast_sleep)
    service = RetrievalService(search_provider=exa, fallback_provider=tavily, cache=SearchCache())

    async def mock_post(*args, **kwargs):
        url_str = ""
        for a in args:
            if isinstance(a, (str, httpx.URL)):
                url_str = str(a)
                break
        if not url_str:
            url_str = str(kwargs.get("url", ""))
        req = httpx.Request("POST", url_str)
        return httpx.Response(500, json={"error": "Down"}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    outcome = await service.retrieve("live commodity rates")
    assert outcome.status == "provider_unavailable"
    assert outcome.results == []
    assert "failed" in outcome.error.lower()


# ─────────────────────────────────────────────────────────────────────────────
# 3. Search Caching & Concurrency Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_search_cache_normalization_and_deduplication():
    cache = SearchCache(ttl_seconds=3600)
    await cache.set(
        "Current   Petrol Price in Delhi",
        [{"title": "Fuel", "url": "https://fuel.com", "content": "Price is 94"}],
        provider="exa",
        fallback_used=False,
    )

    # Equivalent query with different casing and whitespace
    hit = await cache.get("current petrol price in delhi")
    assert hit is not None
    results, prov, fallback = hit
    assert len(results) == 1
    assert prov == "exa"
    assert fallback is False

    # Different query should miss
    miss = await cache.get("gold rate in delhi")
    assert miss is None


@pytest.mark.asyncio
async def test_search_cache_concurrency():
    cache = SearchCache(ttl_seconds=3600)

    async def worker(idx: int):
        q = f"query-{idx % 5}"
        await cache.set(q, [{"title": f"Title {idx}", "url": f"https://example.com/{idx}", "content": "test"}], "exa", False)
        return await cache.get(q)

    # Run 50 concurrent cache writes and reads
    tasks = [worker(i) for i in range(50)]
    results = await asyncio.gather(*tasks)
    assert len(results) == 50
    for r in results:
        assert r is not None


# ─────────────────────────────────────────────────────────────────────────────
# 4. Search Decision Logic in LangGraph (Freshness vs Conceptual)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_search_skipped_for_conceptual_and_coding_questions():
    class DummyLLM:
        name = "dummy"
        models = ["dummy-model"]
        async def generate(self, req):
            return LLMResponse("Should not be called if deterministic check fires", self.name, req.model, 5)

    router = LLMRouter({"dummy": DummyLLM()})
    graph = AgentExecutionGraph(router, retrieval_service=RetrievalService(search_provider=MockSearchProvider()))

    # 1. Pure conceptual question (recursion)
    state_recursion = {
        "agent_id": "test",
        "persona": "Engineer",
        "input_text": "Explain the concept of recursion with a base case and recursive step.",
        "provider": "dummy",
        "model": "dummy-model",
        "allow_fallback": False,
        "search_enabled": True,
        "search_query": "",
        "node_events": [],
    }
    updated = await graph.node_decide_search(state_recursion)
    assert updated["search_query"] == ""
    assert updated["search_status"] == "skipped"
    assert "conceptual" in updated["search_decision_reason"].lower()

    # 2. Routine coding implementation
    state_code = {
        "agent_id": "test",
        "persona": "Engineer",
        "input_text": "Write a python function to check if a binary tree is symmetric.",
        "provider": "dummy",
        "model": "dummy-model",
        "allow_fallback": False,
        "search_enabled": True,
        "search_query": "",
        "node_events": [],
    }
    updated_code = await graph.node_decide_search(state_code)
    assert updated_code["search_query"] == ""
    assert updated_code["search_status"] == "skipped"


@pytest.mark.asyncio
async def test_search_triggered_for_freshness_questions():
    class DummyLLM:
        name = "dummy"
        models = ["dummy-model"]
        async def generate(self, req):
            return LLMResponse("{}", self.name, req.model, 5)

    router = LLMRouter({"dummy": DummyLLM()})
    graph = AgentExecutionGraph(router, retrieval_service=RetrievalService(search_provider=MockSearchProvider()))

    freshness_inputs = [
        "What is the current petrol price in Mumbai today?",
        "What is today's 24K gold rate per 10 grams?",
        "Current spot silver price today",
        "Latest USD to INR exchange rate today",
        "Who won the latest election today?",
    ]

    for user_input in freshness_inputs:
        state = {
            "agent_id": "test",
            "persona": "Finance Advisor",
            "input_text": user_input,
            "provider": "dummy",
            "model": "dummy-model",
            "allow_fallback": False,
            "search_enabled": True,
            "search_query": "",
            "node_events": [],
        }
        updated = await graph.node_decide_search(state)
        assert updated["search_query"] != "", f"Expected search query for '{user_input}'"
        assert updated["search_status"] == "retrieving"
        assert "fresh" in updated["search_decision_reason"].lower() or "search required" in updated["search_decision_reason"].lower()
