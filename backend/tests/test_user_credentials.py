import uuid
import pytest
import httpx
from sqlalchemy import select

from app.core.security import encrypt_credential, decrypt_credential, mask_credential
from app.models import User, UserCredential
from app.services.llm.router import (
    PROVIDER_DISPLAY_NAMES,
    build_llm_router_with_overrides,
    build_default_llm_router,
    LLMRouter,
    LLMError,
)
from app.services.llm.validator import (
    validate_safe_url,
    validate_provider_credential,
    SSRFValidationError,
)


def test_encryption_and_decryption_roundtrip():
    raw_key = "sk-proj-supersecretkey1234567890abcdef"
    encrypted = encrypt_credential(raw_key)

    # Must be encrypted at rest (not plaintext)
    assert encrypted != raw_key
    assert not encrypted.startswith("sk-proj")

    # Roundtrip decryption must match exactly
    decrypted = decrypt_credential(encrypted)
    assert decrypted == raw_key


def test_mask_credential():
    info = mask_credential("sk-proj-1234567890abcdef")
    assert info["prefix"] == "sk-p"
    assert info["suffix"] == "cdef"
    assert info["masked"] == "sk-p...cdef"
    assert "supersecret" not in info["masked"]

    short_info = mask_credential("123")
    assert short_info["masked"] == "••••••••"


def test_clean_provider_names():
    router = build_default_llm_router()
    providers = router.list_providers()

    for p in providers:
        # No "(key missing)" in display names or IDs
        assert "(key missing)" not in p["id"]
        assert "(key missing)" not in p.get("display_name", "")
        # display_name is properly mapped
        assert p["display_name"] == PROVIDER_DISPLAY_NAMES[p["id"]]

    assert set(PROVIDER_DISPLAY_NAMES.keys()) == {
        "openrouter",
        "groq",
        "gemini",
        "openai",
        "xai",
        "openai_compatible",
    }


def test_ssrf_validator_blocks_internal_and_metadata():
    forbidden_urls = [
        "http://127.0.0.1:8000/v1",
        "http://localhost/v1",
        "http://169.254.169.254/latest/meta-data",
        "http://10.0.0.1:5000",
        "http://192.168.1.1",
        "http://172.16.0.1",
        "ftp://example.com/v1",
    ]
    for url in forbidden_urls:
        with pytest.raises(SSRFValidationError):
            validate_safe_url(url)

    # Valid public URL passes
    valid_url = validate_safe_url("https://api.openai.com/v1")
    assert valid_url == "https://api.openai.com/v1"


def test_credential_priority_resolution():
    # Priority 1: User personal key overrides global key
    global_router = build_default_llm_router()
    assert global_router.providers["openai"].configured is False

    user_cred = UserCredential(
        user_id=uuid.uuid4(),
        provider="openai",
        encrypted_api_key=encrypt_credential("sk-user-openai-key-test-123456"),
        is_valid=True,
    )
    user_router = build_llm_router_with_overrides({"openai": user_cred})
    assert user_router.providers["openai"].configured is True
    assert getattr(user_router.providers["openai"], "api_key", None) == "sk-user-openai-key-test-123456"

    # Priority 2: Global configured provider (e.g. groq) remains available
    assert user_router.providers["groq"].configured == global_router.providers["groq"].configured

    # Priority 3: Unconfigured provider raises clear configuration error
    with pytest.raises(LLMError) as exc_info:
        user_router.validate("xai", "grok-3")
    assert "is not configured" in str(exc_info.value)
    assert exc_info.value.category == "configuration"


@pytest.mark.asyncio
async def test_validate_provider_credential_mocked(monkeypatch):
    # Test OpenAI successful validation
    async def mock_openai_get(self, url, *args, **kwargs):
        headers = kwargs.get("headers", {})
        assert "Bearer sk-valid-key" in headers["Authorization"]
        req = httpx.Request("GET", str(url))
        return httpx.Response(200, json={"data": [{"id": "gpt-4.1-mini"}, {"id": "gpt-4.1"}]}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_openai_get)
    is_valid, msg, models = await validate_provider_credential("openai", "sk-valid-key")
    assert is_valid is True
    assert "verified successfully" in msg
    assert "gpt-4.1-mini" in models

    # Test OpenAI 401 Unauthorized
    async def mock_openai_unauthorized(self, url, *args, **kwargs):
        req = httpx.Request("GET", str(url))
        return httpx.Response(401, json={"error": {"message": "Incorrect API key"}}, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_openai_unauthorized)
    is_valid, msg, models = await validate_provider_credential("openai", "sk-invalid-key")
    assert is_valid is False
    assert "Invalid OpenAI API key" in msg


@pytest.mark.asyncio
async def test_user_credential_api_flow(api_context, monkeypatch):
    client = api_context["client"]

    # Register and login two separate users to verify isolation
    reg_a = await client.post("/api/v1/auth/register", json={"email": "user_a@test.com", "password": "Password123!"})
    assert reg_a.status_code == 200
    login_a = await client.post("/api/v1/auth/login", data={"username": "user_a@test.com", "password": "Password123!"})
    assert login_a.status_code == 200
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    reg_b = await client.post("/api/v1/auth/register", json={"email": "user_b@test.com", "password": "Password123!"})
    assert reg_b.status_code == 200
    login_b = await client.post("/api/v1/auth/login", data={"username": "user_b@test.com", "password": "Password123!"})
    assert login_b.status_code == 200
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}


    # 1. User A lists providers before personal key
    res_providers_a = await client.get("/api/v1/llm/providers", headers=headers_a)
    assert res_providers_a.status_code == 200
    openai_a = next(p for p in res_providers_a.json()["providers"] if p["id"] == "openai")
    assert openai_a["display_name"] == "OpenAI"
    assert openai_a["user_configured"] is False
    assert openai_a["requires_key"] is True
    assert "(key missing)" not in openai_a["display_name"]

    # Mock provider validator to return success for test key
    async def mock_validate(provider, key, base_url=None, timeout=5.0):
        return True, "Key confirmed valid.", ["gpt-4.1-mini", "gpt-4.1"]

    from app.api.routes import llm as llm_routes
    monkeypatch.setattr(llm_routes, "validate_provider_credential", mock_validate)

    # 2. User A saves personal OpenAI key
    raw_key = "sk-live-1234567890abcdef"
    save_res = await client.post(
        "/api/v1/llm/credentials",
        headers=headers_a,
        json={"provider": "openai", "api_key": raw_key, "validate": True},
    )
    assert save_res.status_code == 200
    save_data = save_res.json()
    assert save_data["status"] == "success"
    assert save_data["is_valid"] is True
    # Raw key MUST NOT be returned in API response
    assert raw_key not in str(save_data)
    assert save_data["masked"] == "sk-l...cdef"

    # 3. User A now sees OpenAI as configured with masked credential
    res_providers_a2 = await client.get("/api/v1/llm/providers", headers=headers_a)
    openai_a2 = next(p for p in res_providers_a2.json()["providers"] if p["id"] == "openai")
    assert openai_a2["user_configured"] is True
    assert openai_a2["configured"] is True
    assert openai_a2["requires_key"] is False
    assert openai_a2["credential"]["masked"] == "sk-l...cdef"
    assert raw_key not in str(openai_a2)

    # 4. User B MUST NOT see User A's credential (isolation check)
    res_providers_b = await client.get("/api/v1/llm/providers", headers=headers_b)
    openai_b = next(p for p in res_providers_b.json()["providers"] if p["id"] == "openai")
    assert openai_b["user_configured"] is False
    assert openai_b["configured"] is False
    assert openai_b["requires_key"] is True
    assert openai_b["credential"] is None

    # User B credentials list must be empty
    res_creds_b = await client.get("/api/v1/llm/credentials", headers=headers_b)
    assert res_creds_b.status_code == 200
    assert len(res_creds_b.json()["credentials"]) == 0

    # 5. User A can test the credential
    test_res = await client.post(
        "/api/v1/llm/credentials/test",
        headers=headers_a,
        json={"provider": "openai"},
    )
    assert test_res.status_code == 200
    assert test_res.json()["valid"] is True

    # 6. User A replaces and deletes the credential
    del_res = await client.delete("/api/v1/llm/credentials/openai", headers=headers_a)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # After deletion, OpenAI is unconfigured again for User A
    res_providers_a3 = await client.get("/api/v1/llm/providers", headers=headers_a)
    openai_a3 = next(p for p in res_providers_a3.json()["providers"] if p["id"] == "openai")
    assert openai_a3["user_configured"] is False
    assert openai_a3["configured"] is False
