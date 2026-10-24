from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from app.services.llm.registry import FreeModelRegistry, ModelMetadata, model_registry
from app.services.llm.router import LLMError


@dataclass
class ModelSelection:
    provider: str
    model: str
    is_free_tier: bool
    verification_status: str
    selection_reason: str
    fallback_candidates: List[Tuple[str, str]] = field(default_factory=list)


class CapabilityBasedModelSelector:
    """
    Selects the optimal eligible free-tier model based on task demands,
    demonstrated benchmark evidence, verified live status, and real-time health.
    Strictly forbids hidden paid model usage.
    """

    def __init__(self, registry: Optional[FreeModelRegistry] = None):
        self.registry = registry or model_registry

    def select(
        self,
        task_type: str = "general",
        requires_search: bool = False,
        preferred_provider: Optional[str] = None,
        preferred_model: Optional[str] = None,
        configured_providers: Optional[set[str]] = None,
    ) -> ModelSelection:
        """
        Capability-aware free-tier model selection.
        """
        # If explicit model requested, check if valid and configured
        if preferred_provider and preferred_model:
            meta = self.registry.get_model(preferred_provider, preferred_model)
            is_free = meta.free_tier_eligibility in {"verified", "unverified"} if meta else False
            verif = meta.free_tier_eligibility if meta else "unverified"
            return ModelSelection(
                provider=preferred_provider,
                model=preferred_model,
                is_free_tier=is_free,
                verification_status=verif,
                selection_reason=f"Explicit selection requested: {preferred_provider}/{preferred_model}",
                fallback_candidates=[],
            )

        # Automatic mode: fetch all free-tier eligible candidates
        all_free = self.registry.list_models(free_only=True)
        # Filter by configured providers if provided
        if configured_providers:
            candidates = [
                m for m in all_free
                if m.provider_id in configured_providers and self.registry.is_available(m.provider_id, m.model_id)
            ]
        else:
            candidates = [
                m for m in all_free
                if self.registry.is_available(m.provider_id, m.model_id)
            ]

        if not candidates:
            raise LLMError(
                "No eligible free-tier model is currently available or healthy.",
                category="quota",
                retryable=True,
            )

        scored_candidates: List[Tuple[float, ModelMetadata, str]] = []

        for m in candidates:
            score = 0.0
            reasons = []

            # 1. Verification status (verified live models are strongly prioritized)
            if m.free_tier_eligibility == "verified":
                score += 0.35
                reasons.append("verified live")
            else:
                score += 0.10

            # 2. Task capability alignment
            if task_type in {"coding", "troubleshooting"} and "coding" in m.capabilities:
                coding_bm = m.benchmark_scores.get("coding", 0.8)
                score += 0.30 * coding_bm
                reasons.append(f"coding benchmark {coding_bm:.2f}")
            elif task_type in {"finance", "analysis", "reasoning"} and "reasoning" in m.capabilities:
                reasoning_bm = m.benchmark_scores.get("reasoning", 0.8)
                score += 0.30 * reasoning_bm
                reasons.append(f"reasoning benchmark {reasoning_bm:.2f}")
            elif "chat" in m.capabilities:
                score += 0.20
                reasons.append("general chat capable")

            # 3. Search handling capability
            if requires_search and "search" in m.capabilities:
                score += 0.15
                reasons.append("verified search-context ingestion")

            # 4. Latency performance bonus
            if m.latency_p50_ms and m.latency_p50_ms < 3000:
                score += 0.10
                reasons.append(f"fast median latency ({m.latency_p50_ms}ms)")

            # 5. Preferred provider affinity
            if preferred_provider and m.provider_id == preferred_provider:
                score += 0.05

            scored_candidates.append((score, m, ", ".join(reasons)))

        # Deterministic ranking: score descending, then provider asc, then model_id asc
        scored_candidates.sort(key=lambda x: (-x[0], x[1].provider_id, x[1].model_id))

        top_score, best_model, top_reason = scored_candidates[0]

        # Select compatible free fallbacks (up to 2)
        fallbacks: List[Tuple[str, str]] = []
        for _, fb_model, _ in scored_candidates[1:3]:
            fallbacks.append((fb_model.provider_id, fb_model.model_id))

        return ModelSelection(
            provider=best_model.provider_id,
            model=best_model.model_id,
            is_free_tier=True,
            verification_status=best_model.free_tier_eligibility,
            selection_reason=f"Selected {best_model.provider_id}/{best_model.model_id} ({top_reason})",
            fallback_candidates=fallbacks,
        )


model_selector = CapabilityBasedModelSelector()
