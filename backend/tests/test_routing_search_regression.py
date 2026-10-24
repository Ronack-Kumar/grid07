import uuid
import pytest
from app.models import Agent
from app.services.routing.embeddings import EmbeddingService
from app.services.routing.router import PersonaRouter
from app.services.retrieval.search import MockSearchProvider, RetrievalService
from app.services.agents.orchestration import AgentExecutionGraph


def make_standard_agents():
    finance = Agent(
        id=uuid.uuid4(),
        name="Finance Advisor",
        description="Certified financial planner specializing in budgeting, debt management, investment portfolios, retirement, taxation, and personal wealth.",
        expertise=["budget", "salary", "loan", "repay", "debt", "portfolio", "investment", "tax", "savings", "dividends", "mutual funds"],
        is_active=True,
        tools={"search_enabled": True},
    )
    code = Agent(
        id=uuid.uuid4(),
        name="Code Engineer",
        description="Senior software architect and engineer specializing in full-stack engineering, distributed systems, REST, gRPC, database debugging, and async programming.",
        expertise=["rest", "grpc", "microservices", "distributed", "python", "async", "deadlock", "debugging", "database", "api"],
        is_active=True,
        tools={"search_enabled": True},
    )
    security = Agent(
        id=uuid.uuid4(),
        name="Security Specialist",
        description="Cybersecurity consultant and application security engineer focused on vulnerability mitigation, SQL injection defense, zero-trust architectures, and CVE audit.",
        expertise=["sql injection", "injection", "vulnerability", "fastapi", "sanitization", "cve", "owasp", "penetration testing"],
        is_active=True,
        tools={"search_enabled": True},
    )
    research = Agent(
        id=uuid.uuid4(),
        name="Research Assistant",
        description="Academic research specialist and literature synthesizer proficient in technical research papers, empirical studies, and evidence comparison.",
        expertise=["research", "papers", "academic", "literature", "synthesis", "citations", "empirical", "methodology"],
        is_active=True,
        tools={"search_enabled": True},
    )
    general = Agent(
        id=uuid.uuid4(),
        name="General Assistant",
        description="Adaptive multi-disciplinary knowledge assistant capable of broad reasoning, drafting, organization, and general inquiries.",
        expertise=["general", "overview", "explanation", "organization", "notes", "executive summary", "drafting"],
        is_active=True,
        tools={"search_enabled": True},
    )
    return [finance, code, security, research, general]


@pytest.fixture
def embedding_service():
    return EmbeddingService(provider="local_hash")


@pytest.fixture
def persona_router(embedding_service):
    return PersonaRouter(embedding_service=embedding_service)


@pytest.mark.asyncio
async def test_regression_salary_budget_loan_routes_to_finance(persona_router):
    agents = make_standard_agents()
    decision = await persona_router.route(
        "How should I budget my salary and repay my loan?",
        agents
    )
    assert decision.selected_agent_name == "Finance Advisor"
    assert decision.domain == "finance"
    assert decision.calibrated_confidence >= 80.0
    assert decision.match_quality in {"High Confidence", "Moderate Match"}


@pytest.mark.asyncio
async def test_regression_rest_vs_grpc_routes_to_code_or_research(persona_router):
    agents = make_standard_agents()
    decision = await persona_router.route(
        "Provide an in-depth comparative summary between REST and gRPC distributed architectures.",
        agents
    )
    # MUST NOT be Finance Advisor!
    assert decision.selected_agent_name in {"Code Engineer", "Research Assistant"}
    assert decision.domain in {"coding", "research"}
    assert decision.selected_agent_name != "Finance Advisor"


@pytest.mark.asyncio
async def test_regression_python_async_deadlock_routes_to_code_engineer(persona_router):
    agents = make_standard_agents()
    decision = await persona_router.route(
        "Why does my Python async database worker deadlock?",
        agents
    )
    assert decision.selected_agent_name == "Code Engineer"
    assert decision.domain == "coding"


@pytest.mark.asyncio
async def test_regression_sql_injection_routes_to_security_specialist(persona_router):
    agents = make_standard_agents()
    decision = await persona_router.route(
        "How can I prevent SQL injection in FastAPI?",
        agents
    )
    assert decision.selected_agent_name == "Security Specialist"
    assert decision.domain == "cybersecurity"


@pytest.mark.asyncio
async def test_regression_research_paper_synthesis_routes_to_research_assistant(persona_router):
    agents = make_standard_agents()
    decision = await persona_router.route(
        "Compare the evidence from these research papers.",
        agents
    )
    assert decision.selected_agent_name == "Research Assistant"
    assert decision.domain == "research"


@pytest.mark.asyncio
async def test_regression_general_out_of_domain_routes_to_general_assistant(persona_router):
    agents = make_standard_agents()
    decision = await persona_router.route(
        "Help me organize these meeting notes into an executive summary.",
        agents
    )
    assert decision.selected_agent_name == "General Assistant"
    assert decision.domain == "general"


@pytest.mark.asyncio
async def test_regression_conversation_continuity_and_topic_switch(persona_router):
    agents = make_standard_agents()
    finance_agent = next(a for a in agents if a.name == "Finance Advisor")
    code_agent = next(a for a in agents if a.name == "Code Engineer")

    # Step 1: User asks monthly budgeting
    d1 = await persona_router.route("How should I budget my salary and repay my loan?", agents)
    assert d1.selected_agent_name == "Finance Advisor"

    # Step 2: Follow-up retains Finance Advisor via context
    d2 = await persona_router.route(
        "What if my rent increases?",
        agents,
        current_agent_id=str(finance_agent.id),
        conversation_history=[
            {"role": "user", "content": "How should I budget my salary and repay my loan?"},
            {"role": "assistant", "content": "Here is a personalized budget breakdown..."},
        ]
    )
    assert d2.selected_agent_name == "Finance Advisor"

    # Step 3: Clear topic change re-evaluates independently to Code Engineer
    d3 = await persona_router.route(
        "Now explain how gRPC handles streaming",
        agents,
        current_agent_id=str(finance_agent.id),
        conversation_history=[
            {"role": "user", "content": "What if my rent increases?"},
            {"role": "assistant", "content": "You will need to adjust variable spending..."},
        ]
    )
    assert d3.selected_agent_name == "Code Engineer"
    assert d3.selected_agent_name != "Finance Advisor"


@pytest.mark.asyncio
async def test_regression_search_intent_technical_comparison():
    # Build graph with mock LLM router
    from app.services.llm import LLMRouter, LLMResponse

    class MockLLM:
        name = "mock"
        models = ["mock-model"]
        async def generate(self, req):
            return LLMResponse("Search query: rest vs grpc performance architecture", self.name, req.model, 5)

    router = LLMRouter({"mock": MockLLM()})
    retrieval_service = RetrievalService(search_provider=MockSearchProvider())
    graph_builder = AgentExecutionGraph(router, retrieval_service=retrieval_service)

    state = {
        "agent_id": str(uuid.uuid4()),
        "persona": "Code Engineer",
        "input_text": "Provide an in-depth comparative summary between REST and gRPC distributed architectures.",
        "conversation": [],
        "provider": "mock",
        "model": "mock-model",
        "allow_fallback": False,
        "fallback_provider": None,
        "fallback_model": None,
        "search_enabled": True,
        "search_query": "",
        "search_results": "",
        "search_status": "pending",
        "search_sources": [],
        "response": "",
        "error": None,
        "node_events": [],
        "domain": "coding",
    }

    # Execute decide_search
    updated_state = await graph_builder.node_decide_search(state)
    assert updated_state["search_query"] != ""
    assert any(term in updated_state["search_query"].lower() for term in ["rest", "grpc", "architecture"])
    
    # Execute web_search
    retrieved_state = await graph_builder.node_web_search(updated_state)
    assert retrieved_state["search_status"] in {"completed", "no_relevant_sources"}
    if retrieved_state["search_status"] == "completed":
        assert len(retrieved_state["search_sources"]) > 0
        assert any("grpc" in s.get("title", "").lower() or "rest" in s.get("title", "").lower() for s in retrieved_state["search_sources"])


@pytest.mark.asyncio
async def test_regression_search_filtering_rejects_irrelevant_windows_support():
    retrieval = RetrievalService(search_provider=MockSearchProvider())
    # Off-topic windows results must not pass relevance for personal finance queries
    finance_query = "What is a good dividend payout ratio for blue chip stocks?"
    outcome = await retrieval.retrieve(
        query="dividend payout ratio stocks",
        original_query=finance_query,
        domain="finance",
    )
    for res in outcome.results:
        # None of the results should be Windows / File Explorer articles
        title_lower = res.get("title", "").lower()
        snippet_lower = res.get("snippet", "").lower() or res.get("content", "").lower()
        assert "windows" not in title_lower
        assert "file explorer" not in snippet_lower
