import uuid
import pytest
from app.services.llm import LLMError


async def authenticated_workspace(client, name="Test WS"):
    email = f"tester-{uuid.uuid4()}@example.com"
    password = "safe-password-123"
    register = await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert register.status_code == 200, register.text
    login = await client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    ws = await client.post("/api/v1/workspaces/", json={"name": name}, headers=headers)
    assert ws.status_code == 200, ws.text
    return ws.json()["id"], headers


@pytest.mark.asyncio
async def test_successful_chat_execution_persists_metadata_and_messages(api_context):
    client = api_context["client"]
    provider = api_context["provider"]
    provider.error = None

    workspace_id, headers = await authenticated_workspace(client, "Lifecycle WS")

    # 1. Create a genuine agent persona
    create_agent = await client.post(
        f"/api/v1/workspaces/{workspace_id}/agents",
        json={
            "name": "Finance Advisor",
            "description": "Stock and market analysis",
            "provider": "groq",
            "model_name": "test-model",
            "tools": {"search_enabled": False},
        },
        headers=headers,
    )
    assert create_agent.status_code == 201
    agent_id = create_agent.json()["id"]

    # 2. Create genuine conversation
    create_conv = await client.post(
        f"/api/v1/workspaces/{workspace_id}/conversations",
        json={"title": "Tech Dividend Portfolio Analysis"},
        headers=headers,
    )
    assert create_conv.status_code == 200
    conv_id = create_conv.json()["id"]

    # 3. Submit execution linked to conversation
    exec_res = await client.post(
        f"/api/v1/workspaces/{workspace_id}/executions",
        json={
            "input_text": "What are the key risk factors in a tech-heavy dividend portfolio?",
            "conversation_id": conv_id,
            "agent_id": agent_id,
            "routing_mode": "explicit",
        },
        headers=headers,
    )
    assert exec_res.status_code == 200
    exec_id = exec_res.json()["id"]

    # 4. Fetch execution result and verify metadata
    get_exec = await client.get(f"/api/v1/workspaces/{workspace_id}/executions/{exec_id}", headers=headers)
    assert get_exec.status_code == 200
    data = get_exec.json()
    assert data["status"] == "COMPLETED"
    assert data["actual_provider"] == "groq"
    assert data["actual_model"] == "test-model"
    assert data["latency_ms"] is not None
    assert data["output_text"] == "Generated response from persisted persona"

    # 5. Fetch conversation and verify messages persisted
    get_conv = await client.get(f"/api/v1/workspaces/{workspace_id}/conversations/{conv_id}", headers=headers)
    assert get_conv.status_code == 200
    messages = get_conv.json()["messages"]
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert "dividend portfolio" in messages[0]["content"]
    assert messages[1]["role"] == "agent"
    assert "Generated response from persisted persona" in messages[1]["content"]


@pytest.mark.asyncio
async def test_provider_error_handling_marks_failed_terminal_state(api_context):
    client = api_context["client"]
    provider = api_context["provider"]
    provider.error = LLMError("Groq upstream rate limit", category="rate_limit", provider="groq", model="test-model")

    workspace_id, headers = await authenticated_workspace(client, "Error WS")

    create_agent = await client.post(
        f"/api/v1/workspaces/{workspace_id}/agents",
        json={
            "name": "Security Specialist",
            "description": "Vulnerability assessment",
            "provider": "groq",
            "model_name": "test-model",
            "tools": {"search_enabled": False},
        },
        headers=headers,
    )
    assert create_agent.status_code == 201
    agent_id = create_agent.json()["id"]

    exec_res = await client.post(
        f"/api/v1/workspaces/{workspace_id}/executions",
        json={
            "input_text": "Audit CSRF protection",
            "agent_id": agent_id,
            "routing_mode": "explicit",
        },
        headers=headers,
    )
    assert exec_res.status_code == 200
    exec_id = exec_res.json()["id"]

    get_exec = await client.get(f"/api/v1/workspaces/{workspace_id}/executions/{exec_id}", headers=headers)
    assert get_exec.status_code == 200
    data = get_exec.json()
    assert data["status"] == "FAILED"
    assert data["error_category"] == "rate_limit"
    assert "rate limit" in (data["error_message"] or "").lower()
    assert data["latency_ms"] is not None

    # Reset error on provider for subsequent tests
    provider.error = None


@pytest.mark.asyncio
async def test_workspace_isolation_and_empty_conversation_history(api_context):
    client = api_context["client"]
    provider = api_context["provider"]
    provider.error = None

    ws1_id, headers1 = await authenticated_workspace(client, "Workspace A")
    ws2_id, headers2 = await authenticated_workspace(client, "Workspace B")

    # Create conversation in ws1
    conv_create = await client.post(
        f"/api/v1/workspaces/{ws1_id}/conversations",
        json={"title": "WS1 Confidential Chat"},
        headers=headers1,
    )
    assert conv_create.status_code == 200

    # Query ws1 conversations -> must return 1
    list1 = await client.get(f"/api/v1/workspaces/{ws1_id}/conversations", headers=headers1)
    assert list1.status_code == 200
    assert len(list1.json()) == 1
    assert list1.json()[0]["title"] == "WS1 Confidential Chat"

    # Query ws2 conversations -> must return 0 (no fake conversations leaking)
    list2 = await client.get(f"/api/v1/workspaces/{ws2_id}/conversations", headers=headers2)
    assert list2.status_code == 200
    assert len(list2.json()) == 0
