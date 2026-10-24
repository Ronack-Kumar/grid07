import uuid
import pytest
import numpy as np

from app.models import Agent
from app.services.routing.router import PersonaRouter, RoutingDecision


class MockEmbeddingService:
    def __init__(self):
        self.registry = {
            "finance": np.array([1.0, 0.0, 0.0, 0.0]),
            "coding": np.array([0.0, 1.0, 0.0, 0.0]),
            "security": np.array([0.0, 0.0, 1.0, 0.0]),
            "general": np.array([0.0, 0.0, 0.0, 1.0]),
        }

    async def get_embedding(self, text: str) -> np.ndarray:
        lower = text.lower()
        if any(w in lower for w in ["stock", "dividend", "finance", "portfolio", "crypto", "bitcoin"]):
            return np.array([0.9, 0.1, 0.0, 0.0])
        elif any(w in lower for w in ["code", "python", "bug", "traceback", "function", "javascript"]):
            return np.array([0.0, 0.95, 0.05, 0.0])
        elif any(w in lower for w in ["security", "vulnerability", "exploit", "cve", "injection", "firewall"]):
            return np.array([0.0, 0.05, 0.95, 0.0])
        elif any(w in lower for w in ["assistant", "general", "help", "everyday"]):
            return np.array([0.0, 0.0, 0.0, 0.9])
        elif any(w in lower for w in ["surgery", "brain", "craniotomy"]):
            return np.array([0.1, 0.1, 0.8, 0.0])
        elif any(w in lower for w in ["weather", "tokyo"]):
            return np.array([0.0, 0.0, 0.1, 0.1])
        elif any(w in lower for w in ["meaning of life", "ambiguous", "random"]):
            return np.array([0.0, 0.0, 0.0, 0.0])
        # Deterministic feature representation
        import hashlib
        h = int(hashlib.md5(text.encode()).hexdigest(), 16)
        vec = np.array([(h >> (i * 8) & 0xFF) for i in range(4)], dtype=float)
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec


def make_agent(
    name: str,
    description: str,
    expertise: list[str] = None,
    is_active: bool = True,
    agent_id: str = None
) -> Agent:
    agent = Agent()
    agent.id = uuid.UUID(agent_id) if agent_id else uuid.uuid4()
    agent.name = name
    agent.description = description
    agent.expertise = expertise or []
    agent.is_active = is_active
    agent.provider = "groq"
    agent.model_name = "openai/gpt-oss-20b"
    return agent


@pytest.mark.asyncio
async def test_finance_question_selects_finance_expert():
    router = PersonaRouter(MockEmbeddingService())
    finance_agent = make_agent("Finance Advisor", "Expert in equity portfolios, stock valuation, and dividends", expertise=["portfolio", "dividends"])
    coding_agent = make_agent("Code Engineer", "Expert in Python software architecture and debugging", expertise=["python", "debugging"])
    security_agent = make_agent("Security Analyst", "Expert in penetration testing and CVE analysis", expertise=["vulnerabilities"])

    decision = await router.route("What is a good dividend payout ratio for blue chip stocks?", [finance_agent, coding_agent, security_agent])
    assert decision.selected_agent_name == "Finance Advisor"
    assert decision.domain == "finance"
    assert decision.confidence_score >= 0.5


@pytest.mark.asyncio
async def test_coding_question_selects_coding_expert():
    router = PersonaRouter(MockEmbeddingService())
    finance_agent = make_agent("Finance Advisor", "Expert in equity portfolios, stock valuation, and dividends")
    coding_agent = make_agent("Code Engineer", "Expert in Python software architecture and debugging", expertise=["python", "bug"])

    decision = await router.route("How do I fix a Python TypeError exception in my async function?", [finance_agent, coding_agent])
    assert decision.selected_agent_name == "Code Engineer"
    assert decision.domain == "coding"
    assert decision.intent in {"troubleshooting", "inquiry"}


@pytest.mark.asyncio
async def test_security_question_selects_security_expert():
    router = PersonaRouter(MockEmbeddingService())
    coding_agent = make_agent("Code Engineer", "Expert in Python software architecture and debugging")
    security_agent = make_agent("Security Specialist", "Expert in application security, SQL injection defense, and CVE audit", expertise=["injection", "cve"])

    decision = await router.route("Audit this endpoint for SQL injection vulnerability and sanitize inputs", [coding_agent, security_agent])
    assert decision.selected_agent_name == "Security Specialist"
    assert decision.domain == "cybersecurity"


@pytest.mark.asyncio
async def test_similar_display_names_do_not_cause_incorrect_routing():
    router = PersonaRouter(MockEmbeddingService())
    agent_a = make_agent("Advisor Alpha", "Specializes in stock investments and financial portfolios", expertise=["stock", "portfolio"])
    agent_b = make_agent("Advisor Beta", "Specializes in code refactoring, python scripts, and debugging", expertise=["code", "python"])

    decision = await router.route("Review my python code function", [agent_a, agent_b])
    assert decision.selected_agent_name == "Advisor Beta"


@pytest.mark.asyncio
async def test_expertise_metadata_affects_relevance():
    router = PersonaRouter(MockEmbeddingService())
    # Both are named generic 'Assistant', but one has specific expertise
    agent_plain = make_agent("Assistant", "General purpose helper")
    agent_expert = make_agent("Consultant", "General advisor", expertise=["dividend", "stock", "portfolio"])

    decision = await router.route("Analyze my dividend portfolio strategy", [agent_plain, agent_expert])
    assert decision.selected_agent_name == "Consultant"


@pytest.mark.asyncio
async def test_disabled_personas_excluded_from_routing():
    router = PersonaRouter(MockEmbeddingService())
    disabled_finance = make_agent("Finance Advisor", "Expert in stock valuation", is_active=False)
    general_agent = make_agent("General Assistant", "Helpful assistant for all questions")

    decision = await router.route("What stocks should I invest in?", [disabled_finance, general_agent])
    # Disabled persona must NEVER be selected
    assert decision.selected_agent_id != str(disabled_finance.id)
    assert decision.selected_agent_name == "General Assistant"


@pytest.mark.asyncio
async def test_no_enabled_personas_returns_setup_message():
    router = PersonaRouter(MockEmbeddingService())
    disabled_agent = make_agent("Inactive Agent", "Disabled agent", is_active=False)

    decision = await router.route("Hello world", [disabled_agent])
    assert decision.selected_agent_id is None
    assert "No enabled expert personas found" in decision.selection_reason
    assert decision.routing_strategy == "no_enabled_personas"


@pytest.mark.asyncio
async def test_low_confidence_uses_general_fallback():
    router = PersonaRouter(MockEmbeddingService())
    specialist = make_agent("Neurosurgeon", "Deep brain surgery specialist", expertise=["craniotomy"])
    general = make_agent("General Assistant", "General assistant for everyday tasks")

    # High threshold requires very confident match
    decision = await router.route("What is the weather like in Tokyo tomorrow?", [specialist, general], threshold=0.85)
    # Specialist should not falsely claim confident match; routes to general fallback
    assert decision.is_fallback is True
    assert decision.selected_agent_name == "General Assistant"
    assert decision.routing_strategy == "general_fallback"


@pytest.mark.asyncio
async def test_conversational_continuity_preserves_context():
    router = PersonaRouter(MockEmbeddingService())
    finance_agent = make_agent("Finance Advisor", "Expert in stock investments", expertise=["stock", "portfolio"])
    coding_agent = make_agent("Code Engineer", "Expert in Python software architecture", expertise=["python"])

    # First turn: User asks about stocks -> Finance
    turn1 = await router.route("What is Apple stock trading at?", [finance_agent, coding_agent])
    assert turn1.selected_agent_name == "Finance Advisor"

    # Second turn: User asks brief follow-up: "And what about its dividend yield?"
    # Conversational continuity keeps Finance Advisor
    turn2 = await router.route(
        "And what about its dividend yield?",
        [finance_agent, coding_agent],
        current_agent_id=str(finance_agent.id)
    )
    assert turn2.selected_agent_name == "Finance Advisor"


@pytest.mark.asyncio
async def test_topic_change_switches_persona():
    router = PersonaRouter(MockEmbeddingService())
    finance_agent = make_agent("Finance Advisor", "Expert in stock investments", expertise=["stock"])
    coding_agent = make_agent("Code Engineer", "Expert in Python code and scripts", expertise=["python", "code"])

    # First turn was finance, but user switches clearly to coding
    decision = await router.route(
        "Now write a python function to parse a CSV file of transactions",
        [finance_agent, coding_agent],
        current_agent_id=str(finance_agent.id)
    )
    # Topic change should override continuity and switch to Code Engineer
    assert decision.selected_agent_name == "Code Engineer"


@pytest.mark.asyncio
async def test_tie_breaking_is_deterministic():
    router = PersonaRouter(MockEmbeddingService())
    # Two identical agents with identical descriptions and embeddings
    id_a = "00000000-0000-0000-0000-000000000001"
    id_b = "00000000-0000-0000-0000-000000000002"
    agent_a = make_agent("Alpha Specialist", "Specialist helper", agent_id=id_a)
    agent_b = make_agent("Beta Specialist", "Specialist helper", agent_id=id_b)

    d1 = await router.route("Hello helper", [agent_b, agent_a])
    d2 = await router.route("Hello helper", [agent_a, agent_b])
    # Order of candidates in input must NOT change the winner
    assert d1.selected_agent_id == d2.selected_agent_id


@pytest.mark.asyncio
async def test_ambiguous_question_returns_clarification_when_no_general_fallback():
    router = PersonaRouter(MockEmbeddingService())
    specialist = make_agent("Neurosurgeon", "Deep brain surgery specialist", expertise=["craniotomy"])

    decision = await router.route("What is the meaning of life?", [specialist], threshold=0.85)
    assert decision.selected_agent_id is None
    assert decision.needs_clarification is True
    assert decision.routing_strategy == "clarification"
    assert "No specialist reached confidence threshold" in decision.selection_reason


@pytest.mark.asyncio
async def test_selected_persona_is_actually_executed():
    from app.services.execution_runner import run_execution
    from app.services.llm import LLMRouter, LLMResponse
    from app.models import Execution, Workspace
    from app.core.db import AsyncSessionLocal
    from sqlalchemy import select

    router = PersonaRouter(MockEmbeddingService())
    exec_id = uuid.uuid4()
    ws_id = uuid.uuid4()

    class MockProvider:
        name = "groq"
        models = ["openai/gpt-oss-20b"]
        configured = True
        received_personas = []

        async def generate(self, req):
            self.received_personas.append(req.system_prompt)
            return LLMResponse("Executed response", self.name, req.model, 10)

    mock_prov = MockProvider()
    mock_prov.received_personas.clear()

    async with AsyncSessionLocal() as session:
        # Create workspace and distinct agents
        ws = Workspace(id=ws_id, name="Execution Integrity Test", owner_id=uuid.uuid4())
        session.add(ws)
        finance_agent = make_agent(
            "Finance Wizard",
            "Expert in stock valuations and dividend portfolios",
            expertise=["stock", "dividend"],
        )
        finance_agent.workspace_id = ws_id
        finance_agent.provider = "groq"
        finance_agent.model_name = "openai/gpt-oss-20b"
        session.add(finance_agent)

        coding_agent = make_agent(
            "Code Guru",
            "Expert in Python algorithms and debugging",
            expertise=["python", "code"],
        )
        coding_agent.workspace_id = ws_id
        coding_agent.provider = "groq"
        coding_agent.model_name = "openai/gpt-oss-20b"
        session.add(coding_agent)

        execution = Execution(
            id=exec_id,
            workspace_id=ws_id,
            agent_id=None,  # Automatic mode
            input_text="What is the dividend yield on Apple stock?",
            routing_mode="automatic",
            status="PENDING",
            routing_decisions={"request": {"routing_mode": "automatic"}},
        )
        session.add(execution)
        await session.commit()

    try:
        await run_execution(
            execution_id=exec_id,
            session_factory=AsyncSessionLocal,
            persona_router=router,
            llm_router_factory=lambda: LLMRouter({"groq": mock_prov}),
        )

        async with AsyncSessionLocal() as session:
            completed_exec = await session.get(Execution, exec_id)
            assert completed_exec is not None
            assert completed_exec.status == "COMPLETED"
            # Selected persona MUST be Finance Wizard
            assert completed_exec.agent_id == finance_agent.id
            # System instructions sent to LLM MUST contain Finance Wizard
            assert any("Finance Wizard" in p for p in mock_prov.received_personas)
            assert not any("Code Guru" in p for p in mock_prov.received_personas)
    finally:
        # Cleanup
        async with AsyncSessionLocal() as session:
            e = await session.get(Execution, exec_id)
            if e:
                await session.delete(e)
            f_agent = await session.get(Agent, finance_agent.id)
            if f_agent:
                await session.delete(f_agent)
            c_agent = await session.get(Agent, coding_agent.id)
            if c_agent:
                await session.delete(c_agent)
            w = await session.get(Workspace, ws_id)
            if w:
                await session.delete(w)
            await session.commit()

