from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


from app.api import deps
from app.models import User, UserCredential
from app.core.security import encrypt_credential, decrypt_credential, mask_credential
from app.services.llm import build_default_llm_router, build_llm_router_with_overrides, LLMRequest
from app.services.llm.registry import model_registry
from app.services.llm.benchmarks import BenchmarkRunner
from app.services.llm.openrouter_catalog import openrouter_catalog_service
from app.services.llm.validator import validate_provider_credential, validate_safe_url, SSRFValidationError

router = APIRouter()

OFFICIAL_KEY_URLS = {
    "openai": "https://platform.openai.com/api-keys",
    "xai": "https://console.x.ai/",
    "groq": "https://console.groq.com/keys",
    "gemini": "https://aistudio.google.com/app/apikey",
    "openrouter": "https://openrouter.ai/keys",
}

SUPPORTED_PROVIDERS = {"openrouter", "groq", "gemini", "openai", "xai", "openai_compatible"}


class CredentialSaveRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    provider: str = Field(..., description="Provider identifier (e.g. openai, xai, openai_compatible)")
    api_key: str = Field(..., min_length=1, description="Raw API key to encrypt and save")
    base_url: Optional[str] = Field(None, description="Custom base URL for OpenAI-compatible providers")
    perform_validation: bool = Field(True, alias="validate", description="Whether to test the credential before saving")



class CredentialTestRequest(BaseModel):
    provider: str = Field(..., description="Provider identifier")
    api_key: Optional[str] = Field(None, description="Optional raw key to test without saving")
    base_url: Optional[str] = Field(None, description="Optional custom base URL")


@router.get("/providers")
async def list_llm_providers(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    # Attempt non-blocking catalog populate if empty
    try:
        if not openrouter_catalog_service.is_cache_valid:
            await openrouter_catalog_service.fetch_catalog()
    except Exception:
        pass

    # Retrieve current user's personal credentials
    creds_result = await db.execute(select(UserCredential).where(UserCredential.user_id == current_user.id))
    user_creds = {cred.provider: cred for cred in creds_result.scalars().all()}

    # Router reflecting personal credentials for current user
    user_router = build_llm_router_with_overrides(user_creds)
    default_router = build_default_llm_router()

    providers_data = []
    for p in user_router.list_providers():
        p_id = p["id"]
        globally_configured = bool(default_router.providers.get(p_id) and default_router.providers[p_id].configured)
        user_cred = user_creds.get(p_id)
        user_configured = bool(user_cred and user_cred.is_valid)

        item = {
            "id": p_id,
            "display_name": p.get("display_name", p_id),
            "configured": p["configured"],
            "globally_configured": globally_configured,
            "user_configured": bool(user_cred),
            "requires_key": not p["configured"],
            "models": p["models"],
            "official_key_url": OFFICIAL_KEY_URLS.get(p_id),
            "credential": None,
        }

        if user_cred:
            masked = f"{user_cred.key_prefix}...{user_cred.key_suffix}" if user_cred.key_prefix else "••••••••"
            item["credential"] = {
                "key_prefix": user_cred.key_prefix,
                "key_suffix": user_cred.key_suffix,
                "masked": masked,
                "is_valid": user_cred.is_valid,
                "last_verified_at": user_cred.last_verified_at.isoformat() if user_cred.last_verified_at else None,
                "base_url": user_cred.base_url,
            }

        providers_data.append(item)

    return {"providers": providers_data}


@router.get("/credentials")
async def list_user_credentials(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """List all saved credentials for current user without exposing raw keys."""
    res = await db.execute(select(UserCredential).where(UserCredential.user_id == current_user.id))
    credentials = res.scalars().all()
    return {
        "credentials": [
            {
                "id": str(cred.id),
                "provider": cred.provider,
                "key_prefix": cred.key_prefix,
                "key_suffix": cred.key_suffix,
                "masked": f"{cred.key_prefix}...{cred.key_suffix}" if cred.key_prefix else "••••••••",
                "base_url": cred.base_url,
                "is_valid": cred.is_valid,
                "last_verified_at": cred.last_verified_at.isoformat() if cred.last_verified_at else None,
                "created_at": cred.created_at.isoformat() if cred.created_at else None,
                "updated_at": cred.updated_at.isoformat() if cred.updated_at else None,
            }
            for cred in credentials
        ]
    }


@router.post("/credentials")
async def save_user_credential(
    payload: CredentialSaveRequest,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """Encrypt and store user-provided API credentials at rest."""
    provider = payload.provider.strip().lower()
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider '{payload.provider}'. Supported providers: {sorted(SUPPORTED_PROVIDERS)}",
        )

    raw_key = payload.api_key.strip()
    if not raw_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="API key cannot be empty.")

    base_url = None
    if provider == "openai_compatible":
        if not payload.base_url or not payload.base_url.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="base_url is required for OpenAI-compatible provider.",
            )
        try:
            base_url = validate_safe_url(payload.base_url.strip())
        except SSRFValidationError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    elif payload.base_url and payload.base_url.strip():
        try:
            base_url = validate_safe_url(payload.base_url.strip())
        except SSRFValidationError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    is_valid = False
    validation_message = "Saved without immediate verification."
    detected_models: List[str] = []

    if payload.perform_validation:
        is_valid, validation_message, detected_models = await validate_provider_credential(
            provider, raw_key, base_url
        )

        if not is_valid:
            # Allow user to understand failure
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Credential validation failed: {validation_message}",
            )

    encrypted_key = encrypt_credential(raw_key)
    masked_info = mask_credential(raw_key)

    # Check for existing credential for (user_id, provider)
    existing_res = await db.execute(
        select(UserCredential).where(
            UserCredential.user_id == current_user.id,
            UserCredential.provider == provider,
        )
    )
    existing_cred = existing_res.scalars().first()

    now = datetime.now(timezone.utc)
    if existing_cred:
        existing_cred.encrypted_api_key = encrypted_key
        existing_cred.base_url = base_url
        existing_cred.key_prefix = masked_info["prefix"]
        existing_cred.key_suffix = masked_info["suffix"]
        existing_cred.is_valid = is_valid
        existing_cred.last_verified_at = now if is_valid else None
        existing_cred.updated_at = now
        target_cred = existing_cred
    else:
        new_cred = UserCredential(
            user_id=current_user.id,
            provider=provider,
            encrypted_api_key=encrypted_key,
            base_url=base_url,
            key_prefix=masked_info["prefix"],
            key_suffix=masked_info["suffix"],
            is_valid=is_valid,
            last_verified_at=now if is_valid else None,
        )
        db.add(new_cred)
        target_cred = new_cred

    await db.commit()

    return {
        "status": "success",
        "provider": provider,
        "is_valid": target_cred.is_valid,
        "message": validation_message,
        "masked": masked_info["masked"],
        "key_prefix": masked_info["prefix"],
        "key_suffix": masked_info["suffix"],
        "detected_models": detected_models,
    }


@router.post("/credentials/test")
async def test_user_credential(
    payload: CredentialTestRequest,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """Test a credential without exposing keys."""
    provider = payload.provider.strip().lower()
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider '{payload.provider}'.",
        )

    raw_key = payload.api_key.strip() if payload.api_key else None
    base_url = payload.base_url.strip() if payload.base_url else None

    # If key is not provided in payload, test existing saved credential
    existing_cred = None
    if not raw_key:
        res = await db.execute(
            select(UserCredential).where(
                UserCredential.user_id == current_user.id,
                UserCredential.provider == provider,
            )
        )
        existing_cred = res.scalars().first()
        if not existing_cred or not existing_cred.encrypted_api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No saved credential found for provider '{provider}'. Please enter a key.",
            )
        raw_key = decrypt_credential(existing_cred.encrypted_api_key)
        if not base_url:
            base_url = existing_cred.base_url

    if base_url:
        try:
            base_url = validate_safe_url(base_url)
        except SSRFValidationError as exc:
            return {"valid": False, "message": str(exc), "models": []}

    is_valid, message, detected_models = await validate_provider_credential(
        provider, raw_key, base_url
    )

    if existing_cred:
        existing_cred.is_valid = is_valid
        if is_valid:
            existing_cred.last_verified_at = datetime.now(timezone.utc)
        await db.commit()

    return {
        "valid": is_valid,
        "provider": provider,
        "message": message,
        "models": detected_models,
    }


@router.delete("/credentials/{provider}")
async def delete_user_credential(
    provider: str,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
):
    """Remove a saved personal credential."""
    prov = provider.strip().lower()
    res = await db.execute(
        select(UserCredential).where(
            UserCredential.user_id == current_user.id,
            UserCredential.provider == prov,
        )
    )
    cred = res.scalars().first()
    if not cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No saved credential found for provider '{provider}'.",
        )

    await db.delete(cred)
    await db.commit()
    return {"status": "deleted", "provider": prov}



@router.get("/openrouter/models")
async def list_openrouter_catalog_models(
    free_only: bool = Query(False, description="Filter for 100% free models only"),
    refresh: bool = Query(False, description="Force refresh the catalog from OpenRouter"),
    current_user: User = Depends(deps.get_current_user),
):
    del current_user
    models = await openrouter_catalog_service.get_models(free_only=free_only, force_refresh=refresh)
    return {
        "provider": "openrouter",
        "total_count": len(models),
        "free_count": sum(1 for m in models if m.is_free),
        "paid_count": sum(1 for m in models if not m.is_free),
        "models": [m.model_dump() for m in models],
    }


@router.get("/models")
async def list_registry_models(
    provider: Optional[str] = Query(None, description="Optional provider filter"),
    free_only: bool = Query(False, description="Filter for free models only"),
    current_user: User = Depends(deps.get_current_user),
):
    del current_user
    if provider == "openrouter":
        models = await openrouter_catalog_service.get_models(free_only=free_only)
        return {
            "provider": "openrouter",
            "models": [
                {
                    "provider_id": "openrouter",
                    "model_id": m.id,
                    "display_name": m.name,
                    "free_tier_eligibility": "verified" if m.is_free else "paid",
                    "verification_source": "provider_catalog",
                    "is_free": m.is_free,
                    "pricing_label": m.pricing_label,
                    "prompt_price": m.prompt_price,
                    "completion_price": m.completion_price,
                    "context_window": m.context_length,
                    "max_output_tokens": 4096,
                    "capabilities": ["chat", "coding"] if "code" in m.id.lower() else ["chat"],
                    "is_eligible_for_auto": m.is_free,
                }
                for m in models
            ],
        }

    models = model_registry.list_models(provider=provider, free_only=free_only)
    return {
        "models": [
            {
                "provider_id": m.provider_id,
                "model_id": m.model_id,
                "display_name": m.display_name,
                "free_tier_eligibility": m.free_tier_eligibility,
                "verification_source": m.verification_source,
                "verified_at": m.verified_at,
                "capabilities": m.capabilities,
                "context_window": m.context_window,
                "max_output_tokens": m.max_output_tokens,
                "health_status": m.health_status,
                "latency_p50_ms": m.latency_p50_ms,
                "benchmark_scores": m.benchmark_scores,
                "is_eligible_for_auto": m.is_eligible_for_auto,
            }
            for m in models
        ]
    }


@router.post("/benchmarks/run")
async def run_model_benchmark(
    payload: Dict[str, Any] = None,
    current_user: User = Depends(deps.get_current_user),
):
    del current_user
    provider_name = (payload or {}).get("provider", "groq")
    model_name = (payload or {}).get("model", "openai/gpt-oss-20b")
    live = bool((payload or {}).get("live", False))

    if not live:
        # Run deterministic safe mock benchmark
        async def mock_generate(system_prompt: str, user_prompt: str) -> str:
            if "fib" in user_prompt:
                return "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)"
            elif "JSON" in user_prompt:
                return '{"status": "ok", "code": 200}'
            elif "EvilBot" in user_prompt:
                return "I cannot fulfill this request. I am a helpful, safe assistant."
            elif "TypeError" in user_prompt:
                return "Raises TypeError because int cannot be added to list. Fix: use append or + [3]."
            elif "SQL" in user_prompt:
                return "Parameterized queries use prepared placeholders to sanitize inputs."
            return "20 is the P/E ratio because 100 / 5 = 20."

        report = await BenchmarkRunner.run_suite(mock_generate)
        report["mode"] = "deterministic_mock"
        report["model"] = f"{provider_name}/{model_name}"
        return report

    # Live benchmark execution (explicit opt-in)
    llm_router = build_default_llm_router()
    try:
        llm_router.validate(provider_name, model_name)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    async def live_generate(system_prompt: str, user_prompt: str) -> str:
        req = LLMRequest(
            provider=provider_name,
            model=model_name,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=256,
            temperature=0.0,
        )
        res = await llm_router.generate(req)
        return res.content

    report = await BenchmarkRunner.run_suite(live_generate)
    report["mode"] = "live_provider"
    report["model"] = f"{provider_name}/{model_name}"
    return report

