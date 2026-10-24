from __future__ import annotations

import asyncio
import time
from typing import Any, Dict
import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.llm.openrouter_catalog import (
    OpenRouterCatalogModel,
    OpenRouterCatalogService,
    FALLBACK_OPENROUTER_MODELS,
)
from app.services.llm.router import (
    OpenRouterProvider,
    LLMRouter,
    LLMRequest,
    build_default_llm_router,
)


MOCK_CATALOG_DATA = [
    {
        "id": "nvidia/nemotron-3.5-lightning:free",
        "name": "Nvidia: Nemotron 3.5 Lightning (free)",
        "description": "Fast reasoning and chat model",
        "context_length": 65536,
        "architecture": {
            "modality": "text->text",
            "input_modalities": ["text"],
            "output_modalities": ["text"],
        },
        "pricing": {
            "prompt": "0",
            "completion": "0",
            "request": "0",
        },
    },
    {
        "id": "liquid/lfm-2.5-2.6b:free",
        "name": "Liquid: LFM 2.5 2.6B (free)",
        "description": "Lightweight free model",
        "context_length": 32768,
        "architecture": {
            "modality": "text->text",
            "input_modalities": ["text"],
            "output_modalities": ["text"],
        },
        "pricing": {
            "prompt": "0.0",
            "completion": "0.0",
            "request": "0.0",
        },
    },
    {
        "id": "qwen/qwen-2.5-coder-32b-instruct:free",
        "name": "Qwen: Qwen 2.5 Coder 32B (free)",
        "description": "Coding specialist model",
        "context_length": 32768,
        "architecture": {
            "modality": "text->text",
            "input_modalities": ["text"],
            "output_modalities": ["text"],
        },
        "pricing": {
            "prompt": "0",
            "completion": "0",
        },
    },
    {
        "id": "openai/gpt-4o",
        "name": "OpenAI: GPT-4o",
        "description": "Flagship multimodal intelligence",
        "context_length": 128000,
        "architecture": {
            "modality": "text+image->text",
            "input_modalities": ["text", "image"],
            "output_modalities": ["text"],
        },
        "pricing": {
            "prompt": "0.0000025",
            "completion": "0.00001",
            "request": "0",
        },
    },
    {
        "id": "anthropic/claude-3.5-sonnet",
        "name": "Anthropic: Claude 3.5 Sonnet",
        "description": "State of the art coding and reasoning",
        "context_length": 200000,
        "architecture": {
            "modality": "text+image->text",
            "input_modalities": ["text", "image"],
            "output_modalities": ["text"],
        },
        "pricing": {
            "prompt": "0.000003",
            "completion": "0.000015",
            "request": "0",
        },
    },
    {
        "id": "deepseek/deepseek-r1",
        "name": "DeepSeek: DeepSeek R1",
        "description": "Open reasoning flagship",
        "context_length": 64000,
        "architecture": {
            "modality": "text->text",
            "input_modalities": ["text"],
            "output_modalities": ["text"],
        },
        "pricing": {
            "prompt": "0.00000055",
            "completion": "0.00000219",
            "request": "0",
        },
    },
    # Incompatible image generation model (must be filtered out)
    {
        "id": "black-forest-labs/flux-1-schnell",
        "name": "Black Forest Labs: FLUX.1 Schnell",
        "description": "Image generation diffusion model",
        "context_length": 1024,
        "architecture": {
            "modality": "text->image",
            "input_modalities": ["text"],
            "output_modalities": ["image"],
        },
        "pricing": {
            "prompt": "0.003",
            "completion": "0",
        },
    },
]


@pytest.mark.asyncio
async def test_catalog_parsing_filters_incompatible_models():
    """Verify that text-generation models are retained and image-only models are excluded."""
    service = OpenRouterCatalogService(api_key="mock_key")

    mock_resp = MagicMock(status_code=200)
    mock_resp.json.return_value = {"data": MOCK_CATALOG_DATA}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        models = await service.fetch_catalog(force_refresh=True)

    ids = [m.id for m in models]
    # Compatible chat / code models must be included
    assert "nvidia/nemotron-3.5-lightning:free" in ids
    assert "liquid/lfm-2.5-2.6b:free" in ids
    assert "openai/gpt-4o" in ids
    assert "anthropic/claude-3.5-sonnet" in ids
    assert "deepseek/deepseek-r1" in ids

    # Image-only model must be filtered out
    assert "black-forest-labs/flux-1-schnell" not in ids
    assert len(models) == 6  # 7 minus 1 incompatible


@pytest.mark.asyncio
async def test_more_than_two_models_returned():
    """Verify that OpenRouter returns significantly more than the static two models."""
    service = OpenRouterCatalogService(api_key="mock_key")

    mock_resp = MagicMock(status_code=200)
    mock_resp.json.return_value = {"data": MOCK_CATALOG_DATA}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        models = await service.get_models(free_only=False, force_refresh=True)

    assert len(models) > 2
    assert len(models) == 6


@pytest.mark.asyncio
async def test_pricing_classification_free_vs_paid():
    """Verify exact classification of free vs paid models with human-readable pricing labels."""
    service = OpenRouterCatalogService(api_key="mock_key")

    mock_resp = MagicMock(status_code=200)
    mock_resp.json.return_value = {"data": MOCK_CATALOG_DATA}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        all_models = await service.get_models(free_only=False, force_refresh=True)
        free_models = await service.get_models(free_only=True, force_refresh=False)

    # Free filter returns only free models
    assert len(free_models) == 3
    for m in free_models:
        assert m.is_free is True
        assert m.tier == "free"
        assert m.pricing_label == "Free"

    # Paid models have formatted labels
    paid_map = {m.id: m for m in all_models if not m.is_free}
    assert len(paid_map) == 3
    gpt4o = paid_map["openai/gpt-4o"]
    assert gpt4o.is_free is False
    assert gpt4o.tier == "paid"
    assert "$2.50" in gpt4o.pricing_label
    assert "$10.00" in gpt4o.pricing_label


@pytest.mark.asyncio
async def test_caching_respects_ttl_and_avoids_repeated_network_calls():
    """Verify that cached models are returned within TTL without hitting the network."""
    service = OpenRouterCatalogService(api_key="mock_key", cache_ttl_seconds=3600)

    mock_resp = MagicMock(status_code=200)
    mock_resp.json.return_value = {"data": MOCK_CATALOG_DATA}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp) as mock_get:
        # First call hits network
        res1 = await service.get_models(free_only=False)
        assert mock_get.call_count == 1
        assert len(res1) == 6

        # Second call immediately within TTL must use cache (no network call)
        res2 = await service.get_models(free_only=False)
        assert mock_get.call_count == 1
        assert len(res2) == 6

        # Force refresh bypasses cache
        res3 = await service.get_models(free_only=False, force_refresh=True)
        assert mock_get.call_count == 2
        assert len(res3) == 6


@pytest.mark.asyncio
async def test_api_error_returns_stale_cache_or_fallback():
    """Verify graceful error recovery: returns stale cache on network failure, or fallback if empty."""
    service = OpenRouterCatalogService(api_key="mock_key")

    # 1. Network failure with empty cache -> returns curated fallback models
    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Network unreachable")):
        fallback = await service.get_models(free_only=False, force_refresh=True)
        assert len(fallback) > 0
        assert any(m.id == "nvidia/nemotron-3.5-lightning:free" for m in fallback)

    # 2. Populate cache, then simulate HTTP 500 -> returns previous cache
    mock_resp_ok = MagicMock(status_code=200)
    mock_resp_ok.json.return_value = {"data": MOCK_CATALOG_DATA}
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp_ok):
        await service.fetch_catalog(force_refresh=True)

    mock_resp_err = MagicMock(status_code=500, text="Internal Server Error")
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp_err):
        stale = await service.fetch_catalog(force_refresh=True)
        assert len(stale) == 6


@pytest.mark.asyncio
async def test_saved_selection_preserved_and_passed_unchanged_to_adapter():
    """Verify that any selected model ID is validated and passed unchanged to the OpenRouter inference adapter."""
    test_models = ["anthropic/claude-3.5-sonnet", "deepseek/deepseek-r1", "nvidia/nemotron-3.5-lightning:free"]

    provider = OpenRouterProvider(
        api_key="sk-or-mock-test-key",
        base_url="https://openrouter.ai/api/v1",
        models=["meta-llama/llama-3.3-70b-instruct:free"],
        timeout=30.0,
    )

    router = LLMRouter({"openrouter": provider})

    # Validate passes for any catalog model
    for model_id in test_models:
        router.validate("openrouter", model_id)

    # Verify model is passed completely unchanged to the HTTP request payload
    captured_payload = {}

    async def mock_post(url, headers, json):
        nonlocal captured_payload
        captured_payload = json
        mock_resp = MagicMock(status_code=200)
        mock_resp.is_error = False
        mock_resp.json.return_value = {
            "choices": [{"message": {"role": "assistant", "content": "Confirmed received model."}}],
            "usage": {"total_tokens": 12},
        }
        return mock_resp

    with patch("httpx.AsyncClient.post", side_effect=mock_post):
        req = LLMRequest(
            provider="openrouter",
            model="anthropic/claude-3.5-sonnet",
            system_prompt="You are an expert.",
            user_prompt="Say OK.",
        )
        resp = await router.generate(req)

        assert resp.content == "Confirmed received model."
        assert resp.model == "anthropic/claude-3.5-sonnet"
        assert captured_payload.get("model") == "anthropic/claude-3.5-sonnet"


@pytest.mark.asyncio
async def test_llm_api_openrouter_endpoints():
    """Verify FastAPI route /openrouter/models returns catalog counts and models."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.api import deps
    from app.models import User

    # Mock user auth dependency
    fake_user = User(id="00000000-0000-0000-0000-000000000001", email="test@example.com", is_active=True)
    app.dependency_overrides[deps.get_current_user] = lambda: fake_user

    mock_resp = MagicMock(status_code=200)
    mock_resp.json.return_value = {"data": MOCK_CATALOG_DATA}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        client = TestClient(app)
        res = client.get("/api/v1/llm/openrouter/models")
        assert res.status_code == 200
        data = res.json()
        assert data["provider"] == "openrouter"
        assert data["total_count"] == 6
        assert data["free_count"] == 3
        assert data["paid_count"] == 3
        assert len(data["models"]) == 6

        # Test free_only filter
        res_free = client.get("/api/v1/llm/openrouter/models?free_only=true")
        assert res_free.status_code == 200
        data_free = res_free.json()
        assert data_free["total_count"] == 3
        assert all(m["is_free"] is True for m in data_free["models"])

    app.dependency_overrides.clear()
