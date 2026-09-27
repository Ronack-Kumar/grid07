import pytest
from app.services.routing.embeddings import EmbeddingService
from app.services.routing.router import PersonaRouter

# A mock Agent class to simulate SQLAlchemy model
class MockAgent:
    def __init__(self, id, name, description):
        self.id = id
        self.name = name
        self.description = description

@pytest.mark.asyncio
async def test_persona_routing():
    embedding_service = EmbeddingService()
    router = PersonaRouter(embedding_service=embedding_service)
    
    agents = [
        MockAgent("1", "Finance Agent", "Expert in cryptocurrency, stocks, and macroeconomics."),
        MockAgent("2", "Tech Agent", "Expert in software engineering, AI models, and programming."),
        MockAgent("3", "Health Agent", "Expert in fitness, nutrition, and medical advice.")
    ]
    
    # Test a finance query
    finance_query = "What is the current price of Bitcoin?"
    decisions = await router.route_input(finance_query, agents)
    
    # The selected agent should be Finance Agent (id "1")
    selected = [d for d in decisions if d["selected"]][0]
    assert selected["agent_id"] == "1"
    
    # Test a tech query
    tech_query = "How do I write a React hook?"
    decisions2 = await router.route_input(tech_query, agents)
    selected2 = [d for d in decisions2 if d["selected"]][0]
    assert selected2["agent_id"] == "2"
