from __future__ import annotations

import ipaddress
import socket
from typing import List, Optional, Tuple
from urllib.parse import urlparse

import httpx


class SSRFValidationError(ValueError):
    """Raised when a user-supplied URL targets a private, loopback, or reserved network address."""
    pass


def validate_safe_url(url_str: str) -> str:
    """
    Validate that a user-supplied URL uses HTTP/HTTPS and does not resolve
    to loopback, private, link-local, or cloud-metadata IP addresses (SSRF defense).
    """
    if not url_str or not url_str.strip():
        raise SSRFValidationError("URL cannot be empty.")
    
    clean_url = url_str.strip()
    parsed = urlparse(clean_url)
    if parsed.scheme.lower() not in {"http", "https"}:
        raise SSRFValidationError(f"Invalid URL scheme '{parsed.scheme}'. Only http and https are permitted.")
    
    hostname = parsed.hostname
    if not hostname:
        raise SSRFValidationError("URL must include a valid hostname.")

    # Disallow known localhost aliases directly
    if hostname.lower() in {"localhost", "localhost.localdomain", "broadcasthost"}:
        raise SSRFValidationError("Access to localhost is prohibited for security.")

    try:
        # Resolve hostname to all associated IP addresses
        addr_infos = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
    except socket.gaierror as exc:
        raise SSRFValidationError(f"Could not resolve hostname '{hostname}'.") from exc

    for item in addr_infos:
        ip_str = item[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        
        # Check against private, loopback, link-local, multicast, or reserved ranges
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip_str.startswith("169.254.") # Cloud metadata
            or ip_str.startswith("100.64.")  # Carrier-grade NAT
        ):
            raise SSRFValidationError(
                f"URL resolves to an internal or private network address ({ip_str}), which is prohibited."
            )

    return clean_url


async def validate_provider_credential(
    provider: str,
    api_key: str,
    base_url: Optional[str] = None,
    timeout: float = 5.0,
) -> Tuple[bool, str, List[str]]:
    """
    Validate an entered API key against the provider's official lightweight endpoints.
    Returns:
        (is_valid: bool, status_message: str, detected_models: List[str])
    """
    provider_clean = (provider or "").lower().strip()
    key_clean = (api_key or "").strip()

    if not key_clean:
        return False, "API key is required.", []

    if provider_clean == "openai":
        url = "https://api.openai.com/v1/models"
        headers = {"Authorization": f"Bearer {key_clean}"}
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.get(url, headers=headers)
            if res.status_code == 200:
                data = res.json()
                models = [m.get("id") for m in data.get("data", []) if m.get("id")]
                return True, "OpenAI API key verified successfully.", models
            elif res.status_code in {401, 403}:
                return False, "Invalid OpenAI API key or unauthorized.", []
            elif res.status_code == 429:
                return False, "OpenAI rate limit or quota exceeded.", []
            return False, f"OpenAI returned error status {res.status_code}.", []
        except httpx.TimeoutException:
            return False, "Verification timed out connecting to OpenAI.", []
        except httpx.HTTPError as exc:
            return False, f"Network error connecting to OpenAI: {exc}", []

    elif provider_clean == "xai":
        url = "https://api.x.ai/v1/models"
        headers = {"Authorization": f"Bearer {key_clean}"}
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.get(url, headers=headers)
            if res.status_code == 200:
                data = res.json()
                models = [m.get("id") for m in data.get("data", []) if m.get("id")]
                return True, "xAI API key verified successfully.", models
            elif res.status_code in {401, 403}:
                return False, "Invalid xAI API key or unauthorized.", []
            elif res.status_code == 429:
                return False, "xAI rate limit or quota exceeded.", []
            return False, f"xAI returned error status {res.status_code}.", []
        except httpx.TimeoutException:
            return False, "Verification timed out connecting to xAI.", []
        except httpx.HTTPError as exc:
            return False, f"Network error connecting to xAI: {exc}", []

    elif provider_clean == "openrouter":
        url = "https://openrouter.ai/api/v1/auth/key"
        headers = {"Authorization": f"Bearer {key_clean}"}
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.get(url, headers=headers)
            if res.status_code == 200:
                return True, "OpenRouter API key verified successfully.", []
            elif res.status_code in {401, 403}:
                return False, "Invalid OpenRouter API key.", []
            return False, f"OpenRouter returned status {res.status_code}.", []
        except httpx.TimeoutException:
            return False, "Verification timed out connecting to OpenRouter.", []
        except httpx.HTTPError as exc:
            return False, f"Network error connecting to OpenRouter: {exc}", []

    elif provider_clean == "groq":
        url = "https://api.groq.com/openai/v1/models"
        headers = {"Authorization": f"Bearer {key_clean}"}
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.get(url, headers=headers)
            if res.status_code == 200:
                data = res.json()
                models = [m.get("id") for m in data.get("data", []) if m.get("id")]
                return True, "Groq API key verified successfully.", models
            elif res.status_code in {401, 403}:
                return False, "Invalid Groq API key.", []
            return False, f"Groq returned status {res.status_code}.", []
        except httpx.TimeoutException:
            return False, "Verification timed out connecting to Groq.", []
        except httpx.HTTPError as exc:
            return False, f"Network error connecting to Groq: {exc}", []

    elif provider_clean == "gemini":
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key_clean}"
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                models = [m.get("name", "").replace("models/", "") for m in data.get("models", []) if m.get("name")]
                return True, "Gemini API key verified successfully.", models
            elif res.status_code in {400, 401, 403}:
                return False, "Invalid Gemini API key.", []
            return False, f"Gemini returned status {res.status_code}.", []
        except httpx.TimeoutException:
            return False, "Verification timed out connecting to Gemini.", []
        except httpx.HTTPError as exc:
            return False, f"Network error connecting to Gemini: {exc}", []

    elif provider_clean == "openai_compatible":
        if not base_url:
            return False, "Base URL is required for OpenAI-compatible endpoints.", []
        try:
            safe_base = validate_safe_url(base_url)
        except SSRFValidationError as exc:
            return False, f"SSRF Security Violation: {str(exc)}", []

        clean_base = safe_base.rstrip("/")
        models_url = f"{clean_base}/models" if clean_base.endswith("/v1") else f"{clean_base}/v1/models"
        headers = {"Authorization": f"Bearer {key_clean}"} if key_clean else {}
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.get(models_url, headers=headers)
            if res.status_code == 200:
                data = res.json()
                models = [m.get("id") for m in data.get("data", []) if isinstance(m, dict) and m.get("id")]
                return True, "OpenAI-compatible endpoint verified successfully.", models
            elif res.status_code in {401, 403}:
                return False, "Authentication failed for OpenAI-compatible endpoint.", []
            return False, f"Endpoint returned status code {res.status_code}.", []
        except httpx.TimeoutException:
            return False, "Timed out connecting to OpenAI-compatible endpoint.", []
        except httpx.HTTPError as exc:
            return False, f"Network error connecting to OpenAI-compatible endpoint: {exc}", []

    return False, f"Validation is not supported for provider '{provider}'.", []
