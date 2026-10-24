from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Mapping, Optional, Protocol

import httpx
from groq import AsyncGroq

from app.core.config import settings


@dataclass
class LLMRequest:
    provider: str
    model: str
    system_prompt: str
    user_prompt: str
    conversation: List[Dict[str, str]] = field(default_factory=list)
    max_tokens: int = settings.LLM_MAX_TOKENS
    temperature: float = 0.2
    allow_fallback: bool = False
    fallback_provider: Optional[str] = None
    fallback_model: Optional[str] = None


@dataclass
class LLMResponse:
    content: str
    provider: str
    model: str
    latency_ms: int
    usage: Dict[str, Any] = field(default_factory=dict)
    fallback_used: bool = False
    attempts: List[Dict[str, str]] = field(default_factory=list)


class LLMError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        category: str = "provider_error",
        provider: Optional[str] = None,
        model: Optional[str] = None,
        retryable: bool = False,
    ):
        super().__init__(message)
        self.safe_message = message
        self.category = category
        self.provider = provider
        self.model = model
        self.retryable = retryable


class LLMProvider(Protocol):
    name: str
    models: List[str]

    @property
    def configured(self) -> bool: ...

    async def generate(self, request: LLMRequest) -> LLMResponse: ...


def _messages(request: LLMRequest) -> List[Dict[str, str]]:
    messages = [{"role": "system", "content": request.system_prompt}]
    messages.extend(
        message
        for message in request.conversation
        if message.get("role") in {"user", "assistant"} and message.get("content")
    )
    messages.append({"role": "user", "content": request.user_prompt})
    return messages


def _category_from_status(status_code: int) -> str:
    if status_code in {401, 403}:
        return "authentication"
    if status_code == 404:
        return "model_not_found"
    if status_code == 429:
        return "rate_limit"
    if status_code in {402, 409}:
        return "quota"
    if status_code >= 500:
        return "provider_unavailable"
    return "provider_error"


import re

def _safe_http_error(provider: str, model: str, response: httpx.Response) -> LLMError:
    status_code = response.status_code
    category = _category_from_status(status_code)
    details = ""
    try:
        err_data = response.json()
        if isinstance(err_data, dict):
            if "error" in err_data:
                err_obj = err_data["error"]
                if isinstance(err_obj, dict):
                    details = str(err_obj.get("message", ""))
                    reason = ""
                    for d in err_obj.get("details", []):
                        if isinstance(d, dict) and "reason" in d:
                            reason = str(d.get("reason", ""))
                    lower_msg = details.lower()
                    if reason == "API_KEY_INVALID" or "api key not valid" in lower_msg or "invalid api key" in lower_msg:
                        category = "authentication"
                    elif reason == "RESOURCE_EXHAUSTED" or "resource has been exhausted" in lower_msg:
                        category = "rate_limit"
                    elif "quota" in lower_msg:
                        category = "quota"
                elif isinstance(err_obj, str):
                    details = err_obj
            elif "message" in err_data:
                details = str(err_data["message"])
    except Exception:
        details = ""

    # Sanitize details so no API keys appear in messages or traces
    if details:
        details = re.sub(r"(AIza[0-9A-Za-z-_]{35}|gsk_[0-9A-Za-z]{30,}|sk-[0-9A-Za-z]{20,})", "[REDACTED_KEY]", details)

    if status_code == 404 or category == "model_not_found":
        msg = f"The requested model '{model}' does not exist or is not accessible on {provider} (HTTP 404)."
    elif category == "authentication":
        msg = f"Authentication failed for {provider}: Invalid or unconfigured credentials."
    elif category == "rate_limit":
        msg = f"{provider} rate limit exceeded (HTTP 429)."
    elif category == "quota":
        msg = f"{provider} quota exhausted or credits depleted."
    elif category == "provider_unavailable":
        msg = f"{provider} is currently unavailable (HTTP {status_code})."
    else:
        msg = f"{provider} rejected the request ({status_code})."

    return LLMError(
        msg,
        category=category,
        provider=provider,
        model=model,
        retryable=category in {"rate_limit", "provider_unavailable", "timeout"},
    )


class GroqProvider:
    name = "groq"

    def __init__(self, api_key: str, models: Iterable[str], timeout: float):
        self.api_key = api_key
        self.models = list(models)
        self.timeout = timeout

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def generate(self, request: LLMRequest) -> LLMResponse:
        if not self.configured:
            raise LLMError(
                "GROQ_API_KEY is not configured.",
                category="configuration",
                provider=self.name,
                model=request.model,
            )
        started = asyncio.get_running_loop().time()
        max_retries = 2
        base_backoff = 0.5
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                client = AsyncGroq(api_key=self.api_key, timeout=self.timeout)
                result = await client.chat.completions.create(
                    model=request.model,
                    messages=_messages(request),
                    max_tokens=request.max_tokens,
                    temperature=request.temperature,
                )
                usage = result.usage.model_dump() if result.usage else {}
                return LLMResponse(
                    content=(result.choices[0].message.content or "").strip(),
                    provider=self.name,
                    model=request.model,
                    latency_ms=int((asyncio.get_running_loop().time() - started) * 1000),
                    usage=usage,
                )
            except asyncio.TimeoutError as exc:
                last_error = LLMError(
                    "Groq request timed out.", category="timeout", provider=self.name, model=request.model, retryable=True
                )
            except Exception as exc:
                status = getattr(exc, "status_code", None)
                category = _category_from_status(status) if isinstance(status, int) else "provider_error"
                err_str = str(exc).lower()
                if status == 404 or "model_not_found" in err_str or "does not exist" in err_str:
                    category = "model_not_found"
                    msg = f"The requested model '{request.model}' does not exist or is not accessible on Groq (HTTP 404)."
                elif status in {401, 403} or "invalid_api_key" in err_str or "unauthorized" in err_str:
                    category = "authentication"
                    msg = "Authentication failed for Groq: Invalid or unconfigured credentials."
                elif status == 429:
                    category = "rate_limit"
                    msg = "Groq rate limit exceeded (HTTP 429)."
                else:
                    msg = f"Groq request failed ({category})."
                last_error = LLMError(
                    msg,
                    category=category,
                    provider=self.name,
                    model=request.model,
                    retryable=category in {"rate_limit", "provider_unavailable", "timeout"},
                )

            if not last_error.retryable or attempt >= max_retries:
                raise last_error
            await asyncio.sleep(base_backoff * (2 ** attempt))

        raise last_error


class OpenAICompatibleProvider:
    def __init__(
        self,
        name: str,
        api_key: str,
        base_url: str,
        models: Iterable[str],
        timeout: float,
        extra_headers: Optional[Mapping[str, str]] = None,
    ):
        self.name = name
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self._models = list(models)
        self.timeout = timeout
        self.extra_headers = dict(extra_headers or {})

    @property
    def models(self) -> List[str]:
        return list(self._models)

    @models.setter
    def models(self, value: Iterable[str]) -> None:
        self._models = list(value)

    def is_model_supported(self, model: str) -> bool:
        if not self._models:
            return True
        return model in self._models

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.base_url)


    async def generate(self, request: LLMRequest) -> LLMResponse:
        if not self.configured:
            raise LLMError(
                f"{self.name} credentials or base URL are not configured.",
                category="configuration",
                provider=self.name,
                model=request.model,
            )
        started = asyncio.get_running_loop().time()
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json", **self.extra_headers}
        payload = {
            "model": request.model,
            "messages": _messages(request),
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
        }
        max_retries = 2
        base_backoff = 0.5
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if response.is_error:
                    last_error = _safe_http_error(self.name, request.model, response)
                else:
                    data = response.json()
                    try:
                        choice = data["choices"][0]
                        msg = choice.get("message") or {}
                        content = msg.get("content")
                        if not content and msg.get("reasoning"):
                            content = msg.get("reasoning")
                        if content is None:
                            content = choice.get("text", "")
                    except (KeyError, IndexError, TypeError) as exc:
                        raise LLMError(
                            f"{self.name} returned an invalid response.",
                            category="invalid_response",
                            provider=self.name,
                            model=request.model,
                        ) from exc
                    actual_model = str(data.get("model") or request.model)
                    return LLMResponse(
                        content=str(content or "").strip(),
                        provider=self.name,
                        model=actual_model,
                        latency_ms=int((asyncio.get_running_loop().time() - started) * 1000),
                        usage=data.get("usage") or {},
                    )

            except httpx.TimeoutException:
                last_error = LLMError(
                    f"{self.name} request timed out.",
                    category="timeout",
                    provider=self.name,
                    model=request.model,
                    retryable=True,
                )
            except httpx.HTTPError:
                last_error = LLMError(
                    f"{self.name} could not be reached.",
                    category="provider_unavailable",
                    provider=self.name,
                    model=request.model,
                    retryable=True,
                )

            if not last_error.retryable or attempt >= max_retries:
                raise last_error
            await asyncio.sleep(base_backoff * (2 ** attempt))

        raise last_error


class OpenRouterProvider(OpenAICompatibleProvider):
    def __init__(
        self,
        api_key: str,
        base_url: str,
        models: Iterable[str],
        timeout: float,
        extra_headers: Optional[Mapping[str, str]] = None,
    ):
        super().__init__(
            name="openrouter",
            api_key=api_key,
            base_url=base_url,
            models=models,
            timeout=timeout,
            extra_headers=extra_headers,
        )

    @property
    def models(self) -> List[str]:
        from app.services.llm.openrouter_catalog import openrouter_catalog_service
        cached = openrouter_catalog_service.get_cached_models()
        if cached:
            return [m.id for m in cached]
        return list(self._models)

    def is_model_supported(self, model: str) -> bool:
        if not model:
            return False
        from app.services.llm.openrouter_catalog import openrouter_catalog_service
        if openrouter_catalog_service.has_model(model):
            return True
        if model in self._models:
            return True
        return "/" in model


class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key: str, models: Iterable[str], timeout: float):
        self.api_key = api_key
        self.models = list(models)
        self.timeout = timeout

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def generate(self, request: LLMRequest) -> LLMResponse:
        if not self.configured:
            raise LLMError(
                "GEMINI_API_KEY is not configured.",
                category="configuration",
                provider=self.name,
                model=request.model,
            )
        started = asyncio.get_running_loop().time()
        contents = []
        for message in request.conversation:
            role = "model" if message.get("role") == "assistant" else "user"
            if message.get("content"):
                contents.append({"role": role, "parts": [{"text": message["content"]}]})
        contents.append({"role": "user", "parts": [{"text": request.user_prompt}]})
        payload = {
            "systemInstruction": {"parts": [{"text": request.system_prompt}]},
            "contents": contents,
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            },
        }
        clean_model = request.model.replace("models/", "")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent"
        max_retries = 2
        base_backoff = 0.5
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(url, params={"key": self.api_key}, json=payload)
                if response.is_error:
                    last_error = _safe_http_error(self.name, request.model, response)
                else:
                    data = response.json()
                    try:
                        parts = data["candidates"][0]["content"]["parts"]
                        non_thought_parts = [p for p in parts if not p.get("thought", False)]
                        target_parts = non_thought_parts if non_thought_parts else parts
                        content = "".join(str(part.get("text", "")) for part in target_parts).strip()
                    except (KeyError, IndexError, TypeError) as exc:
                        raise LLMError(
                            "Gemini returned an invalid response.",
                            category="invalid_response",
                            provider=self.name,
                            model=request.model,
                        ) from exc
                    return LLMResponse(
                        content=content,
                        provider=self.name,
                        model=request.model,
                        latency_ms=int((asyncio.get_running_loop().time() - started) * 1000),
                        usage=data.get("usageMetadata") or {},
                    )
            except httpx.TimeoutException:
                last_error = LLMError(
                    "Gemini request timed out.", category="timeout", provider=self.name, model=request.model, retryable=True
                )
            except httpx.HTTPError:
                last_error = LLMError(
                    "Gemini could not be reached.",
                    category="provider_unavailable",
                    provider=self.name,
                    model=request.model,
                    retryable=True,
                )

            if not last_error.retryable or attempt >= max_retries:
                raise last_error
            await asyncio.sleep(base_backoff * (2 ** attempt))

        raise last_error


PROVIDER_DISPLAY_NAMES = {
    "openrouter": "OpenRouter",
    "groq": "Groq",
    "gemini": "Gemini",
    "openai": "OpenAI",
    "xai": "xAI",
    "openai_compatible": "OpenAI-compatible",
}


class LLMRouter:
    def __init__(self, providers: Mapping[str, LLMProvider]):
        self.providers = dict(providers)

    def list_providers(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": name,
                "display_name": PROVIDER_DISPLAY_NAMES.get(name, name),
                "configured": provider.configured,
                "models": provider.models,
            }
            for name, provider in sorted(self.providers.items())
        ]

    def validate(self, provider: str, model: str) -> None:
        adapter = self.providers.get(provider)
        if not adapter:
            raise LLMError(f"Unsupported provider: {provider}", category="configuration", provider=provider, model=model)
        if hasattr(adapter, "is_model_supported"):
            if not adapter.is_model_supported(model):
                raise LLMError(
                    f"Model '{model}' is not registered for {provider}.",
                    category="configuration",
                    provider=provider,
                    model=model,
                )
        elif adapter.models and model not in adapter.models:
            raise LLMError(
                f"Model '{model}' is not registered for {provider}.",
                category="configuration",
                provider=provider,
                model=model,
            )
        if not adapter.configured:
            raise LLMError(
                f"{provider} is not configured.", category="configuration", provider=provider, model=model
            )

    async def generate(self, request: LLMRequest) -> LLMResponse:
        attempts: List[Dict[str, str]] = []
        candidates = [(request.provider, request.model, False)]
        if request.allow_fallback and request.fallback_provider and request.fallback_model:
            candidates.append((request.fallback_provider, request.fallback_model, True))

        last_error: Optional[LLMError] = None
        for provider_name, model, is_fallback in candidates:
            try:
                self.validate(provider_name, model)
                provider = self.providers[provider_name]
                candidate = LLMRequest(
                    provider=provider_name,
                    model=model,
                    system_prompt=request.system_prompt,
                    user_prompt=request.user_prompt,
                    conversation=request.conversation,
                    max_tokens=request.max_tokens,
                    temperature=request.temperature,
                )
                response = await provider.generate(candidate)
                attempts.append({"provider": provider_name, "model": model, "status": "completed"})
                response.fallback_used = is_fallback
                response.attempts = attempts
                return response
            except LLMError as exc:
                last_error = exc
                attempts.append({
                    "provider": provider_name,
                    "model": model,
                    "status": "failed",
                    "category": exc.category,
                })
                if not is_fallback and len(candidates) > 1 and exc.category in {
                    "authentication",
                    "quota",
                    "rate_limit",
                    "timeout",
                    "provider_unavailable",
                    "provider_error",
                    "configuration",
                    "model_not_found",
                }:
                    continue
                break

        assert last_error is not None
        raise last_error


def build_llm_router_with_overrides(
    credential_map: Optional[Mapping[str, Any]] = None,
) -> LLMRouter:
    from app.core.security import decrypt_credential

    # Default configuration from server settings (Priority 2: Global)
    provider_configs = {
        "groq": {"key": settings.GROQ_API_KEY, "url": None},
        "gemini": {"key": settings.GEMINI_API_KEY, "url": None},
        "xai": {"key": settings.XAI_API_KEY, "url": "https://api.x.ai/v1"},
        "openai": {"key": settings.OPENAI_API_KEY, "url": "https://api.openai.com/v1"},
        "openrouter": {
            "key": settings.OPENROUTER_API_KEY,
            "url": getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        },
        "openai_compatible": {
            "key": settings.OPENAI_COMPATIBLE_API_KEY,
            "url": settings.OPENAI_COMPATIBLE_BASE_URL,
        },
    }

    # Apply personal credentials (Priority 1: User personal key)
    if credential_map:
        for prov, cred in credential_map.items():
            if prov in provider_configs:
                raw_key = None
                base_url = None
                if hasattr(cred, "encrypted_api_key"):
                    raw_key = decrypt_credential(cred.encrypted_api_key)
                    base_url = getattr(cred, "base_url", None)
                elif isinstance(cred, dict):
                    enc = cred.get("encrypted_api_key")
                    if enc:
                        raw_key = decrypt_credential(enc)
                    elif cred.get("api_key"):
                        raw_key = cred["api_key"]
                    base_url = cred.get("base_url")

                if raw_key:
                    provider_configs[prov]["key"] = raw_key
                if base_url:
                    provider_configs[prov]["url"] = base_url

    openai_models = settings.models_for("openai")
    if not openai_models:
        openai_models = ["gpt-4.1-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini"]
    
    xai_models = settings.models_for("xai")
    if not xai_models:
        xai_models = ["grok-3-mini", "grok-3"]

    openai_compat_models = settings.models_for("openai_compatible")
    if not openai_compat_models:
        openai_compat_models = ["custom-model"]

    providers: Dict[str, LLMProvider] = {
        "groq": GroqProvider(provider_configs["groq"]["key"], settings.models_for("groq"), settings.LLM_TIMEOUT_SECONDS),
        "gemini": GeminiProvider(provider_configs["gemini"]["key"], settings.models_for("gemini"), settings.LLM_TIMEOUT_SECONDS),
        "xai": OpenAICompatibleProvider(
            "xai", provider_configs["xai"]["key"], provider_configs["xai"]["url"], xai_models, settings.LLM_TIMEOUT_SECONDS
        ),
        "openai": OpenAICompatibleProvider(
            "openai", provider_configs["openai"]["key"], provider_configs["openai"]["url"], openai_models, settings.LLM_TIMEOUT_SECONDS
        ),
        "openrouter": OpenRouterProvider(
            provider_configs["openrouter"]["key"],
            provider_configs["openrouter"]["url"],
            settings.models_for("openrouter"),
            settings.LLM_TIMEOUT_SECONDS,
            extra_headers={"HTTP-Referer": "http://localhost:3000", "X-Title": settings.PROJECT_NAME},
        ),
        "openai_compatible": OpenAICompatibleProvider(
            "openai_compatible",
            provider_configs["openai_compatible"]["key"],
            provider_configs["openai_compatible"]["url"] or "",
            openai_compat_models,
            settings.LLM_TIMEOUT_SECONDS,
        ),
    }
    return LLMRouter(providers)


def build_default_llm_router() -> LLMRouter:
    return build_llm_router_with_overrides(None)

