from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenRouterCatalogModel(BaseModel):
    id: str
    name: str
    description: str = ""
    context_length: int = 8192
    is_free: bool = False
    tier: str = "paid"  # "free" or "paid"
    pricing_label: str = "Paid"
    prompt_price: float = 0.0
    completion_price: float = 0.0
    request_price: float = 0.0
    pricing: Dict[str, Any] = Field(default_factory=dict)
    architecture: Dict[str, Any] = Field(default_factory=dict)
    supported_modalities: List[str] = Field(default_factory=list)


FREE_ROUTER_MODEL = OpenRouterCatalogModel(
    id="openrouter/free",
    name="Auto-select a free model",
    description="Routes automatically to an available free model across OpenRouter. OpenRouter selects different compatible free models across requests.",
    context_length=131072,
    is_free=True,
    tier="free",
    pricing_label="Free",
    prompt_price=0.0,
    completion_price=0.0,
)

# Curated reliable fallback models when offline or if catalog API is temporarily unreachable
FALLBACK_OPENROUTER_MODELS = [
    FREE_ROUTER_MODEL,
    OpenRouterCatalogModel(

        id="nvidia/nemotron-3.5-lightning:free",
        name="Nvidia: Nemotron 3.5 Lightning (free)",
        description="Fast reasoning & general assistant model available for free tier.",
        context_length=65536,
        is_free=True,
        tier="free",
        pricing_label="Free",
        prompt_price=0.0,
        completion_price=0.0,
    ),
    OpenRouterCatalogModel(
        id="liquid/lfm-2.5-2.6b:free",
        name="Liquid: LFM 2.5 2.6B (free)",
        description="High-efficiency lightweight language model.",
        context_length=32768,
        is_free=True,
        tier="free",
        pricing_label="Free",
        prompt_price=0.0,
        completion_price=0.0,
    ),
    OpenRouterCatalogModel(
        id="recursive/flint-v1.0:free",
        name="Recursive: Flint v1.0 (free)",
        description="Conversational model available on free tier.",
        context_length=32768,
        is_free=True,
        tier="free",
        pricing_label="Free",
        prompt_price=0.0,
        completion_price=0.0,
    ),
    OpenRouterCatalogModel(
        id="meta-llama/llama-3.3-70b-instruct:free",
        name="Meta: Llama 3.3 70B Instruct (free)",
        description="High-performance open weights model on free tier.",
        context_length=131072,
        is_free=True,
        tier="free",
        pricing_label="Free",
        prompt_price=0.0,
        completion_price=0.0,
    ),
    OpenRouterCatalogModel(
        id="mistralai/mistral-small-24b-instruct-2501:free",
        name="Mistral: Mistral Small 24B Instruct (free)",
        description="Capable multilingual model from Mistral AI.",
        context_length=32768,
        is_free=True,
        tier="free",
        pricing_label="Free",
        prompt_price=0.0,
        completion_price=0.0,
    ),
    OpenRouterCatalogModel(
        id="openai/gpt-4.1-mini",
        name="OpenAI: GPT-4.1 Mini",
        description="Fast and cost-efficient intelligent model from OpenAI.",
        context_length=128000,
        is_free=False,
        tier="paid",
        pricing_label="Paid ($0.15 / $0.60 per 1M)",
        prompt_price=0.00000015,
        completion_price=0.0000006,
    ),
    OpenRouterCatalogModel(
        id="anthropic/claude-3.5-sonnet",
        name="Anthropic: Claude 3.5 Sonnet",
        description="State of the art reasoning, coding, and synthesis model.",
        context_length=200000,
        is_free=False,
        tier="paid",
        pricing_label="Paid ($3.00 / $15.00 per 1M)",
        prompt_price=0.000003,
        completion_price=0.000015,
    ),
]


class OpenRouterCatalogService:
    """
    Dynamically loads, parses, classifies, and caches text-generation models
    from OpenRouter's official catalog API (GET https://openrouter.ai/api/v1/models).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        cache_ttl_seconds: Optional[int] = None,
        timeout: float = 15.0,
    ):
        self._api_key = api_key if api_key is not None else settings.OPENROUTER_API_KEY
        self._base_url = (base_url or getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")).rstrip("/")
        self._cache_ttl = cache_ttl_seconds if cache_ttl_seconds is not None else getattr(settings, "OPENROUTER_CATALOG_CACHE_TTL_SECONDS", 3600)
        self._timeout = timeout

        self._cached_models: List[OpenRouterCatalogModel] = []
        self._cached_at: float = 0.0
        self._lock = asyncio.Lock()

    @property
    def is_cache_valid(self) -> bool:
        return bool(self._cached_models) and (time.time() - self._cached_at < self._cache_ttl)

    @staticmethod
    def is_compatible_text_model(raw: Dict[str, Any]) -> bool:
        """
        Determines whether an OpenRouter catalog entry is a text-generation chat/instruction model.
        Filters out incompatible modalities (e.g. image-only generation without text output).
        Never excludes valid chat, coding, reasoning, or multimodal vision-in -> text-out models.
        """
        arch = raw.get("architecture") or {}
        output_modalities = arch.get("output_modalities") or []
        modality = str(arch.get("modality") or "").lower()

        # If output modalities are explicitly specified and do NOT include 'text', exclude
        if output_modalities and "text" not in output_modalities:
            return False

        # Strictly image/audio output only (e.g. text->image, image->image)
        if modality in {"text->image", "image->image", "text->audio", "audio->audio"}:
            return False

        # Must have an ID
        model_id = raw.get("id")
        if not model_id or not isinstance(model_id, str):
            return False

        return True

    @staticmethod
    def parse_catalog_entry(raw: Dict[str, Any]) -> Optional[OpenRouterCatalogModel]:
        """
        Parses a single raw catalog JSON entry into an OpenRouterCatalogModel,
        classifying free vs paid using exact pricing metadata.
        """
        if not OpenRouterCatalogService.is_compatible_text_model(raw):
            return None

        model_id = str(raw.get("id", "")).strip()
        name = str(raw.get("name", "")).strip() or model_id
        description = str(raw.get("description", "")).strip()
        context_length = int(raw.get("context_length") or 8192)

        pricing = raw.get("pricing") or {}
        try:
            prompt_price = float(pricing.get("prompt") or 0.0)
        except (ValueError, TypeError):
            prompt_price = 0.0

        try:
            completion_price = float(pricing.get("completion") or 0.0)
        except (ValueError, TypeError):
            completion_price = 0.0

        try:
            request_price = float(pricing.get("request") or 0.0)
        except (ValueError, TypeError):
            request_price = 0.0

        # Classification rule:
        # 1. Exact zero pricing on prompt, completion, and request, OR
        # 2. Contains ':free' in model ID
        is_free = (prompt_price == 0.0 and completion_price == 0.0 and request_price == 0.0) or (":free" in model_id)

        if is_free:
            tier = "free"
            pricing_label = "Free"
        else:
            tier = "paid"
            prompt_1m = prompt_price * 1_000_000
            comp_1m = completion_price * 1_000_000
            if prompt_1m > 0 or comp_1m > 0:
                pricing_label = f"Paid (${prompt_1m:.2f} / ${comp_1m:.2f} per 1M)"
            elif request_price > 0:
                pricing_label = f"Paid (${request_price:.4f}/req)"
            else:
                pricing_label = "Paid"

        arch = raw.get("architecture") or {}
        input_mods = arch.get("input_modalities") or ["text"]
        output_mods = arch.get("output_modalities") or ["text"]
        supported_modalities = list(set(input_mods + output_mods))

        return OpenRouterCatalogModel(
            id=model_id,
            name=name,
            description=description,
            context_length=context_length,
            is_free=is_free,
            tier=tier,
            pricing_label=pricing_label,
            prompt_price=prompt_price,
            completion_price=completion_price,
            request_price=request_price,
            pricing=pricing,
            architecture=arch,
            supported_modalities=supported_modalities,
        )

    async def fetch_catalog(self, force_refresh: bool = False) -> List[OpenRouterCatalogModel]:
        """
        Fetches the latest catalog from OpenRouter with thread-safe caching,
        safe error recovery, and zero secret leakage.
        """
        async with self._lock:
            if not force_refresh and self.is_cache_valid:
                return list(self._cached_models)

            headers = {
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": settings.PROJECT_NAME,
            }
            if self._api_key:
                headers["Authorization"] = f"Bearer {self._api_key}"

            url = f"{self._base_url}/models"
            try:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    response = await client.get(url, headers=headers)

                if response.status_code != 200:
                    logger.warning("OpenRouter catalog fetch returned HTTP %d: %s", response.status_code, response.text[:200])
                    # If we have any existing cache, use it
                    if self._cached_models:
                        return list(self._cached_models)
                    return list(FALLBACK_OPENROUTER_MODELS)

                data = response.json()
                raw_models = data.get("data", [])
                parsed: List[OpenRouterCatalogModel] = []
                for item in raw_models:
                    model = self.parse_catalog_entry(item)
                    if model is not None:
                        parsed.append(model)

                if parsed:
                    # Sort models: free models first, then paid models alphabetically
                    parsed.sort(key=lambda m: (0 if m.is_free else 1, m.name.lower()))
                    self._cached_models = parsed
                    self._cached_at = time.time()
                    return list(self._cached_models)


            except Exception as exc:
                logger.warning("OpenRouter catalog request failed: %s", exc)

            # On network or parsing failure: return cached if available, else curated fallback
            if self._cached_models:
                return list(self._cached_models)
            return list(FALLBACK_OPENROUTER_MODELS)

    async def get_models(self, free_only: bool = False, force_refresh: bool = False) -> List[OpenRouterCatalogModel]:
        """
        Returns compatible text models, optionally filtered to free-only.
        """
        all_models = await self.fetch_catalog(force_refresh=force_refresh)
        if free_only:
            return [m for m in all_models if m.is_free]
        return all_models

    def get_cached_models(self, free_only: bool = False) -> List[OpenRouterCatalogModel]:
        """
        Synchronously returns cached models if available, otherwise fallback models.
        """
        models = self._cached_models if self._cached_models else FALLBACK_OPENROUTER_MODELS
        if free_only:
            return [m for m in models if m.is_free]
        return list(models)

    def has_model(self, model_id: str) -> bool:
        """
        Checks whether model_id is present in the cache or known fallback list.
        """
        clean_id = model_id.strip()
        models = self._cached_models if self._cached_models else FALLBACK_OPENROUTER_MODELS
        return any(m.id == clean_id for m in models)


# Shared global singleton
openrouter_catalog_service = OpenRouterCatalogService()
