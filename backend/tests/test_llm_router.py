import pytest

from app.services.llm import LLMError, LLMRequest, LLMResponse, LLMRouter


class FakeProvider:
    def __init__(self, name, content="ok", error=None):
        self.name = name
        self.models = [f"{name}-model"]
        self.content = content
        self.error = error
        self.configured = True
        self.requests = []

    async def generate(self, request):
        self.requests.append(request)
        if self.error:
            raise self.error
        return LLMResponse(self.content, self.name, request.model, 4)


@pytest.mark.asyncio
async def test_explicit_provider_is_used_without_silent_fallback():
    primary = FakeProvider("primary")
    fallback = FakeProvider("fallback")
    router = LLMRouter({"primary": primary, "fallback": fallback})
    response = await router.generate(LLMRequest("primary", "primary-model", "system", "user"))
    assert response.provider == "primary"
    assert not fallback.requests


@pytest.mark.asyncio
async def test_configured_fallback_records_actual_provider_and_model():
    primary = FakeProvider(
        "primary",
        error=LLMError("unavailable", category="provider_unavailable", provider="primary", model="primary-model"),
    )
    fallback = FakeProvider("fallback", content="recovered")
    router = LLMRouter({"primary": primary, "fallback": fallback})
    response = await router.generate(
        LLMRequest(
            "primary",
            "primary-model",
            "system",
            "user",
            allow_fallback=True,
            fallback_provider="fallback",
            fallback_model="fallback-model",
        )
    )
    assert response.content == "recovered"
    assert response.provider == "fallback"
    assert response.model == "fallback-model"
    assert response.fallback_used is True
    assert [attempt["status"] for attempt in response.attempts] == ["failed", "completed"]


@pytest.mark.asyncio
async def test_missing_key_surfaces_configuration_error():
    provider = FakeProvider("primary")
    provider.configured = False
    router = LLMRouter({"primary": provider})
    with pytest.raises(LLMError) as exc_info:
        await router.generate(LLMRequest("primary", "primary-model", "system", "user"))
    assert exc_info.value.category == "configuration"


@pytest.mark.asyncio
async def test_model_not_found_triggers_configured_fallback():
    primary = FakeProvider(
        "primary",
        error=LLMError(
            "The requested model 'bad-model' does not exist or is not accessible on primary (HTTP 404).",
            category="model_not_found",
            provider="primary",
            model="bad-model",
        ),
    )
    primary.models = ["bad-model"]
    fallback = FakeProvider("fallback", content="fallback-ok")
    router = LLMRouter({"primary": primary, "fallback": fallback})
    response = await router.generate(
        LLMRequest(
            "primary",
            "bad-model",
            "system",
            "user",
            allow_fallback=True,
            fallback_provider="fallback",
            fallback_model="fallback-model",
        )
    )
    assert response.content == "fallback-ok"
    assert response.fallback_used is True
    assert response.provider == "fallback"
    assert response.model == "fallback-model"
    assert [attempt["category"] for attempt in response.attempts if "category" in attempt] == ["model_not_found"]


@pytest.mark.asyncio
async def test_rate_limit_triggers_fallback_when_allowed():
    primary = FakeProvider("primary", error=LLMError("429 Too Many Requests", category="rate_limit", provider="primary", model="primary-model"))
    fallback = FakeProvider("fallback", content="rate-limit-recovered")
    router = LLMRouter({"primary": primary, "fallback": fallback})
    response = await router.generate(
        LLMRequest(
            "primary",
            "primary-model",
            "system",
            "user",
            allow_fallback=True,
            fallback_provider="fallback",
            fallback_model="fallback-model",
        )
    )
    assert response.content == "rate-limit-recovered"
    assert response.fallback_used is True
    assert response.provider == "fallback"


@pytest.mark.asyncio
async def test_quota_exhaustion_triggers_fallback_when_allowed():
    primary = FakeProvider("primary", error=LLMError("Quota exhausted", category="quota", provider="primary", model="primary-model"))
    fallback = FakeProvider("fallback", content="quota-recovered")
    router = LLMRouter({"primary": primary, "fallback": fallback})
    response = await router.generate(
        LLMRequest(
            "primary",
            "primary-model",
            "system",
            "user",
            allow_fallback=True,
            fallback_provider="fallback",
            fallback_model="fallback-model",
        )
    )
    assert response.content == "quota-recovered"
    assert response.fallback_used is True


@pytest.mark.asyncio
async def test_timeout_triggers_fallback_when_allowed():
    primary = FakeProvider("primary", error=LLMError("Request timed out", category="timeout", provider="primary", model="primary-model"))
    fallback = FakeProvider("fallback", content="timeout-recovered")
    router = LLMRouter({"primary": primary, "fallback": fallback})
    response = await router.generate(
        LLMRequest(
            "primary",
            "primary-model",
            "system",
            "user",
            allow_fallback=True,
            fallback_provider="fallback",
            fallback_model="fallback-model",
        )
    )
    assert response.content == "timeout-recovered"
    assert response.fallback_used is True


@pytest.mark.asyncio
async def test_explicit_override_never_falls_back_even_on_rate_limit():
    primary = FakeProvider("primary", error=LLMError("429 Too Many Requests", category="rate_limit", provider="primary", model="primary-model"))
    fallback = FakeProvider("fallback", content="should-never-reach")
    router = LLMRouter({"primary": primary, "fallback": fallback})
    # allow_fallback=False simulates explicit model override in Playground
    with pytest.raises(LLMError) as exc_info:
        await router.generate(
            LLMRequest(
                "primary",
                "primary-model",
                "system",
                "user",
                allow_fallback=False,
                fallback_provider="fallback",
                fallback_model="fallback-model",
            )
        )
    assert exc_info.value.category == "rate_limit"
    assert not fallback.requests, "Fallback provider must NEVER be invoked on explicit override without fallback"


@pytest.mark.asyncio
async def test_all_permitted_providers_failing_raises_normalized_error():
    primary = FakeProvider("primary", error=LLMError("Rate limited", category="rate_limit", provider="primary", model="primary-model"))
    fallback = FakeProvider("fallback", error=LLMError("Unavailable", category="provider_unavailable", provider="fallback", model="fallback-model"))
    router = LLMRouter({"primary": primary, "fallback": fallback})
    with pytest.raises(LLMError) as exc_info:
        await router.generate(
            LLMRequest(
                "primary",
                "primary-model",
                "system",
                "user",
                allow_fallback=True,
                fallback_provider="fallback",
                fallback_model="fallback-model",
            )
        )
    # Final error surfaces failure from terminal attempt
    assert exc_info.value.category == "provider_unavailable"

