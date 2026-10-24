"""
Grid07 Live API Verification Script
Tests real online API credentials for:
1. Groq LLM
2. Google Gemini LLM
3. OpenRouter LLM
4. Exa Search (Primary)
5. Tavily Search (Fallback)
6. Full LangGraph End-to-End Execution with real Search & LLM generation.

SECURITY: Never prints API keys or credentials.
"""
from __future__ import annotations

import asyncio
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.core.config import settings
from app.services.llm.router import build_default_llm_router, LLMRequest, LLMError
from app.services.retrieval.search import ExaSearchProvider, TavilySearchProvider, RetrievalService
from app.services.agents.orchestration import AgentExecutionGraph


async def test_groq():
    print("\n--- 1. Testing Groq Live API ---")
    router = build_default_llm_router()
    provider = router.providers.get("groq")
    if not provider or not provider.configured:
        print("[GROQ] SKIPPED: GROQ_API_KEY is not configured.")
        return False

    models_to_try = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
    ]
    for model in models_to_try:
        t0 = time.perf_counter()
        try:
            req = LLMRequest(
                provider="groq",
                model=model,
                system_prompt="You are a helpful assistant. Reply in one short sentence.",
                user_prompt="Explain why fast inference is valuable.",
                max_tokens=60,
            )
            resp = await provider.generate(req)
            elapsed = int((time.perf_counter() - t0) * 1000)
            print(f"[GROQ] SUCCESS with model '{model}' in {elapsed}ms")
            print(f"       Response: {resp.content[:120]}...")
            return True
        except LLMError as exc:
            print(f"[GROQ] Model '{model}' failed: [{exc.category}] {exc.safe_message}")
        except Exception as exc:
            print(f"[GROQ] Model '{model}' error: {exc}")
    return False


async def test_gemini():
    print("\n--- 2. Testing Gemini Live API ---")
    router = build_default_llm_router()
    provider = router.providers.get("gemini")
    if not provider or not provider.configured:
        print("[GEMINI] SKIPPED: GEMINI_API_KEY is not configured.")
        return False

    models_to_try = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"]
    for model in models_to_try:
        t0 = time.perf_counter()
        try:
            req = LLMRequest(
                provider="gemini",
                model=model,
                system_prompt="You are a helpful assistant. Reply in one short sentence.",
                user_prompt="What is compound interest?",
                max_tokens=60,
            )
            resp = await provider.generate(req)
            elapsed = int((time.perf_counter() - t0) * 1000)
            print(f"[GEMINI] SUCCESS with model '{model}' in {elapsed}ms")
            print(f"         Response: {resp.content[:120]}...")
            return True
        except LLMError as exc:
            print(f"[GEMINI] Model '{model}' failed: [{exc.category}] {exc.safe_message}")
        except Exception as exc:
            print(f"[GEMINI] Model '{model}' error: {exc}")
    return False


async def test_openrouter():
    print("\n--- 3. Testing OpenRouter Live API ---")
    router = build_default_llm_router()
    provider = router.providers.get("openrouter")
    if not provider or not provider.configured:
        print("[OPENROUTER] SKIPPED: OPENROUTER_API_KEY is not configured.")
        return False

    models_to_try = [
        "nvidia/nemotron-3.5-lightning:free",
        "liquid/lfm-2.5-2.6b:free",
        "recursive/flint-v1.0:free",
        "meta-llama/llama-3.3-70b-instruct:free",
    ]
    for model in models_to_try:
        t0 = time.perf_counter()
        try:
            req = LLMRequest(
                provider="openrouter",
                model=model,
                system_prompt="You are a helpful assistant. Reply in one short sentence.",
                user_prompt="What is distributed architecture?",
                max_tokens=250,
            )
            resp = await provider.generate(req)
            elapsed = int((time.perf_counter() - t0) * 1000)
            print(f"[OPENROUTER] SUCCESS with model '{model}' in {elapsed}ms")
            print(f"             Response: {resp.content[:120]}...")
            return True
        except LLMError as exc:
            print(f"[OPENROUTER] Model '{model}' failed: [{exc.category}] {exc.safe_message}")
        except Exception as exc:
            print(f"[OPENROUTER] Model '{model}' error: {exc}")
    return False


async def test_exa_search():
    print("\n--- 4. Testing Exa Search Live API ---")
    provider = ExaSearchProvider(max_results=3)
    if not provider.configured:
        print("[EXA] SKIPPED: EXA_API_KEY is not configured.")
        return False

    t0 = time.perf_counter()
    try:
        query = "current petrol price in Mumbai today"
        results = await provider.search(query)
        elapsed = int((time.perf_counter() - t0) * 1000)
        print(f"[EXA] SUCCESS: Retrieved {len(results)} results in {elapsed}ms")
        for i, r in enumerate(results[:2]):
            print(f"      Result {i+1}: {r.get('title')} ({r.get('url')})")
            snippet = r.get('content', '')[:100].replace('\n', ' ')
            print(f"                Snippet: {snippet}...")
        return True
    except Exception as exc:
        print(f"[EXA] FAILED: {exc}")
        return False


async def test_tavily_search():
    print("\n--- 5. Testing Tavily Search Live API ---")
    provider = TavilySearchProvider(max_results=3)
    if not provider.configured:
        print("[TAVILY] SKIPPED: TAVILY_API_KEY is not configured.")
        return False

    t0 = time.perf_counter()
    try:
        query = "current gold rate spot price today"
        results = await provider.search(query)
        elapsed = int((time.perf_counter() - t0) * 1000)
        print(f"[TAVILY] SUCCESS: Retrieved {len(results)} results in {elapsed}ms")
        for i, r in enumerate(results[:2]):
            print(f"        Result {i+1}: {r.get('title')} ({r.get('url')})")
            snippet = r.get('content', '')[:100].replace('\n', ' ')
            print(f"                  Snippet: {snippet}...")
        return True
    except Exception as exc:
        print(f"[TAVILY] FAILED: {exc}")
        return False


async def test_full_pipeline_live():
    print("\n--- 6. Testing Full LangGraph Workflow Live ---")
    llm_router = build_default_llm_router()
    retrieval_service = RetrievalService()

    # Determine which configured provider to use for generation
    configured_providers = [name for name, p in llm_router.providers.items() if p.configured]
    print(f"[PIPELINE] Configured LLM providers: {configured_providers}")
    print(f"[PIPELINE] Search primary provider: {getattr(retrieval_service.primary_provider, 'name', 'none')}")
    print(f"[PIPELINE] Search fallback provider: {getattr(retrieval_service.fallback_provider, 'name', 'none')}")

    active_provider = "groq" if "groq" in configured_providers else configured_providers[0]
    active_model = llm_router.providers[active_provider].models[0]

    graph = AgentExecutionGraph(llm_router=llm_router, retrieval_service=retrieval_service).build()

    state = {
        "agent_id": "Finance Advisor",
        "persona": "You are a licensed financial analyst specializing in commodities and macro-economics.",
        "input_text": "What is the current retail petrol price in Mumbai today?",
        "conversation": [],
        "provider": active_provider,
        "model": active_model,
        "allow_fallback": True,
        "fallback_provider": None,
        "fallback_model": None,
        "search_enabled": True,
        "domain": "finance",
        "search_query": "",
        "search_results": "",
        "search_status": "pending",
        "search_sources": [],
        "node_events": [],
        "final_output": {},
    }

    t0 = time.perf_counter()
    try:
        final_state = await graph.ainvoke(state)
        elapsed = int((time.perf_counter() - t0) * 1000)
        output = final_state.get("final_output", {})
        print(f"[PIPELINE] Completed in {elapsed}ms")
        print(f"           Search status: {final_state.get('search_status')}")
        print(f"           Actual search provider: {final_state.get('actual_search_provider')}")
        print(f"           Search sources count: {len(final_state.get('search_sources', []))}")
        print(f"           Generation provider: {output.get('provider')} / {output.get('model')}")
        print(f"           Response text: {output.get('response', '')[:160]}...")
        return True
    except Exception as exc:
        print(f"[PIPELINE] FAILED: {exc}")
        return False


async def main():
    print("==================================================")
    print("GRID07 ONLINE API LIVE VERIFICATION")
    print("==================================================")
    
    groq_ok = await test_groq()
    gemini_ok = await test_gemini()
    openrouter_ok = await test_openrouter()
    exa_ok = await test_exa_search()
    tavily_ok = await test_tavily_search()
    pipeline_ok = await test_full_pipeline_live()

    print("\n==================================================")
    print("ONLINE VERIFICATION SUMMARY")
    print("==================================================")
    print(f"Groq:       {'[PASS]' if groq_ok else '[FAIL/SKIP]'}")
    print(f"Gemini:     {'[PASS]' if gemini_ok else '[FAIL/SKIP]'}")
    print(f"OpenRouter: {'[PASS]' if openrouter_ok else '[FAIL/SKIP]'}")
    print(f"Exa Search: {'[PASS]' if exa_ok else '[FAIL/SKIP]'}")
    print(f"Tavily:     {'[PASS]' if tavily_ok else '[FAIL/SKIP]'}")
    print(f"Pipeline:   {'[PASS]' if pipeline_ok else '[FAIL/SKIP]'}")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(main())
