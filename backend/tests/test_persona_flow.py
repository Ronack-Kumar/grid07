import uuid

import pytest

from app.services.llm import LLMError


async def authenticated_workspace(client):
    email = f"tester-{uuid.uuid4()}@example.com"
    password = "safe-password-123"
    register = await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert register.status_code == 200, register.text
    login = await client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert login.status_code == 200, login.text
    client.headers["Authorization"] = f"Bearer {login.json()['access_token']}"
    workspace = await client.post("/api/v1/workspaces/", json={"name": "Persona Tests"})
    assert workspace.status_code == 200, workspace.text
    return workspace.json()["id"]


@pytest.mark.asyncio
async def test_persona_create_persist_retrieve_and_test(api_context):
    client = api_context["client"]
    provider = api_context["provider"]
    workspace_id = await authenticated_workspace(client)
    create = await client.post(
        f"/api/v1/workspaces/{workspace_id}/agents",
        json={
            "name": "Risk Analyst",
            "description": "Analyzes investment and market risk",
            "personality": "Always quantify uncertainty and identify downside risk.",
            "provider": "groq",
            "model_name": "test-model",
            "tools": {"search_enabled": False},
        },
    )
    assert create.status_code == 201, create.text
    agent_id = create.json()["id"]

    retrieve = await client.get(f"/api/v1/workspaces/{workspace_id}/agents/{agent_id}")
    assert retrieve.status_code == 200
    assert retrieve.json()["personality"] == "Always quantify uncertainty and identify downside risk."

    test_run = await client.post(
        f"/api/v1/workspaces/{workspace_id}/agents/{agent_id}/test",
        json={"input_text": "Assess this investment."},
    )
    assert test_run.status_code == 202, test_run.text
    execution_id = test_run.json()["id"]
    execution = await client.get(f"/api/v1/workspaces/{workspace_id}/executions/{execution_id}")
    assert execution.status_code == 200
    payload = execution.json()
    assert payload["status"] == "COMPLETED"
    assert payload["agent_id"] == agent_id
    assert payload["output_text"] == "Generated response from persisted persona"
    assert payload["actual_provider"] == "groq"
    assert payload["actual_model"] == "test-model"
    assert provider.requests
    assert "Always quantify uncertainty" in provider.requests[-1].system_prompt


@pytest.mark.asyncio
async def test_missing_persona_id_returns_404(api_context):
    client = api_context["client"]
    workspace_id = await authenticated_workspace(client)
    response = await client.post(
        f"/api/v1/workspaces/{workspace_id}/agents/{uuid.uuid4()}/test",
        json={"input_text": "Hello"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_provider_failure_is_recorded_without_fake_success(api_context):
    client = api_context["client"]
    provider = api_context["provider"]
    workspace_id = await authenticated_workspace(client)
    create = await client.post(
        f"/api/v1/workspaces/{workspace_id}/agents",
        json={
            "name": "Failure Persona",
            "description": "Used to verify provider failure handling",
            "personality": "Be precise.",
            "provider": "groq",
            "model_name": "test-model",
            "tools": {"search_enabled": False},
        },
    )
    agent_id = create.json()["id"]
    provider.error = LLMError(
        "Provider rate limit reached.",
        category="rate_limit",
        provider="groq",
        model="test-model",
        retryable=True,
    )
    test_run = await client.post(
        f"/api/v1/workspaces/{workspace_id}/agents/{agent_id}/test",
        json={"input_text": "Trigger provider."},
    )
    execution = await client.get(
        f"/api/v1/workspaces/{workspace_id}/executions/{test_run.json()['id']}"
    )
    payload = execution.json()
    assert payload["status"] == "FAILED"
    assert payload["error_category"] == "rate_limit"
    assert payload["error_message"] == "Provider rate limit reached."
    assert payload["actual_provider"] == "groq"
    assert payload["actual_model"] == "test-model"
    assert payload["search_status"] in {"skipped", "failed", "disabled"}


@pytest.mark.asyncio
async def test_search_planning_model_failure_records_terminal_state(api_context):
    client = api_context["client"]
    provider = api_context["provider"]
    workspace_id = await authenticated_workspace(client)
    create = await client.post(
        f"/api/v1/workspaces/{workspace_id}/agents",
        json={
            "name": "Finance Advisor",
            "description": "Financial and market research advisor",
            "personality": "Be precise and analytical.",
            "provider": "groq",
            "model_name": "test-model",
            "tools": {"search_enabled": True},
        },
    )
    assert create.status_code == 201
    agent_id = create.json()["id"]
    provider.error = LLMError(
        "The requested model 'test-model' does not exist or is not accessible on Groq (HTTP 404).",
        category="model_not_found",
        provider="groq",
        model="test-model",
        retryable=False,
    )
    test_run = await client.post(
        f"/api/v1/workspaces/{workspace_id}/agents/{agent_id}/test",
        json={"input_text": "Analyze financial market trends."},
    )
    assert test_run.status_code == 202
    execution = await client.get(
        f"/api/v1/workspaces/{workspace_id}/executions/{test_run.json()['id']}"
    )
    payload = execution.json()
    assert payload["status"] == "FAILED"
    assert payload["error_category"] == "model_not_found"
    assert "does not exist or is not accessible on Groq" in payload["error_message"]
    assert payload["actual_provider"] == "groq"
    assert payload["actual_model"] == "test-model"
    assert payload["search_status"] == "failed"
    assert payload["node_events"]
    assert any(evt.get("status") == "failed" for evt in payload["node_events"])
