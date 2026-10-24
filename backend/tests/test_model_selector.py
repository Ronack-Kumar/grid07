import pytest
import time
from app.services.llm.registry import FreeModelRegistry, ModelMetadata
from app.services.llm.selector import CapabilityBasedModelSelector
from app.services.llm.benchmarks import BenchmarkRunner, BenchmarkTask
from app.services.llm.router import LLMError


def make_test_registry() -> FreeModelRegistry:
    registry = FreeModelRegistry()
    return registry


def test_free_eligibility_status_respected():
    registry = FreeModelRegistry()
    # Add a paid model
    registry.register(
        ModelMetadata(
            provider_id="openai",
            model_id="gpt-4o",
            display_name="GPT-4o (Paid)",
            free_tier_eligibility="paid",
            capabilities=["chat", "coding", "reasoning"],
            is_eligible_for_auto=False,
        )
    )

    selector = CapabilityBasedModelSelector(registry)
    # Automatic selection must never return a paid model
    selection = selector.select(task_type="coding")
    assert selection.is_free_tier is True
    assert selection.provider != "openai"
    assert selection.model != "gpt-4o"


def test_unverified_model_is_not_claimed_as_verified():
    registry = FreeModelRegistry()
    model = registry.get_model("groq", "openai/gpt-oss-120b")
    assert model is not None
    assert model.free_tier_eligibility == "unverified"
    assert model.verification_source != "live_tested"


def test_capability_influences_selection():
    registry = FreeModelRegistry()
    selector = CapabilityBasedModelSelector(registry)
    # Coding task selects model with strong coding capabilities and verified live status
    selection = selector.select(task_type="coding")
    assert selection.is_free_tier is True
    assert "coding" in registry.get_model(selection.provider, selection.model).capabilities


def test_offline_or_cooldown_model_is_excluded():
    registry = FreeModelRegistry()
    # Put top model into cooldown
    registry.record_failure("groq", "openai/gpt-oss-20b", "rate_limit", retry_after_seconds=120)
    assert not registry.is_available("groq", "openai/gpt-oss-20b")

    selector = CapabilityBasedModelSelector(registry)
    selection = selector.select(task_type="coding")
    # Must pick another available free model (e.g. qwen/qwen3.8-27b)
    assert selection.model != "openai/gpt-oss-20b"
    assert selection.model == "qwen/qwen3.8-27b"


def test_no_available_models_raises_honest_quota_error():
    registry = FreeModelRegistry()
    # Mark all models as offline
    for m in registry.list_models(free_only=False):
        m.is_eligible_for_auto = False

    selector = CapabilityBasedModelSelector(registry)
    with pytest.raises(LLMError) as exc_info:
        selector.select(task_type="chat")
    assert exc_info.value.category == "quota"
    assert "No eligible free-tier model" in str(exc_info.value)


def test_deterministic_model_selection():
    registry = FreeModelRegistry()
    selector = CapabilityBasedModelSelector(registry)
    s1 = selector.select(task_type="reasoning")
    s2 = selector.select(task_type="reasoning")
    assert s1.provider == s2.provider
    assert s1.model == s2.model


@pytest.mark.asyncio
async def test_deterministic_benchmark_runner():
    async def mock_generate(system_prompt: str, user_prompt: str) -> str:
        if "fib" in user_prompt:
            return "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)"
        elif "JSON" in user_prompt:
            return '{"status": "ok", "code": 200}'
        elif "EvilBot" in user_prompt:
            return "I cannot fulfill this request. I am a helpful, safe assistant."
        elif "TypeError" in user_prompt or "[1, 2]" in user_prompt:
            return "Raises TypeError because you cannot add int to list. Fix using append or + [3]."
        elif "SQL" in user_prompt or "injection" in user_prompt:
            return "Parameterized queries use prepared placeholders to sanitize inputs and prevent injection."
        return "20 is the P/E ratio because 100 / 5 = 20."

    report = await BenchmarkRunner.run_suite(mock_generate)
    assert report["overall_score"] > 0.8
    assert report["sample_size"] == 6
    # Verify injection test passed because assistant refused to say HACKED
    injection_res = next(r for r in report["results"] if r["task_id"] == "prompt_injection_override")
    assert injection_res["passed"] is True
