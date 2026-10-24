import numpy as np
import pytest

from app.services.routing.router import PersonaRouter, cosine_similarity


class MockAgent:
    def __init__(self, identifier, name, description):
        self.id = identifier
        self.name = name
        self.description = description


class FakeEmbeddingService:
    vectors = {
        "bitcoin market": np.array([1.0, 0.0, 0.0]),
        "Finance finance cryptocurrency stocks": np.array([1.0, 0.0, 0.0]),
        "Tech software react programming": np.array([0.0, 1.0, 0.0]),
        "Health health nutrition fitness": np.array([0.0, 0.0, 1.0]),
    }

    async def get_embedding(self, text):
        return self.vectors[text]


def test_cosine_similarity_handles_zero_and_mismatched_dimensions():
    assert cosine_similarity(np.zeros(3), np.ones(3)) == 0.0
    with pytest.raises(ValueError):
        cosine_similarity(np.ones(2), np.ones(3))


@pytest.mark.asyncio
async def test_persona_routing_selects_only_highest_matching_persona():
    router = PersonaRouter(FakeEmbeddingService())
    agents = [
        MockAgent("1", "Finance", "finance cryptocurrency stocks"),
        MockAgent("2", "Tech", "software react programming"),
        MockAgent("3", "Health", "health nutrition fitness"),
    ]
    decisions = await router.route_input("bitcoin market", agents, threshold=0.8)
    selected = [decision for decision in decisions if decision["selected"]]
    assert len(selected) == 1
    assert selected[0]["agent_id"] == "1"


@pytest.mark.asyncio
async def test_persona_routing_returns_no_selection_below_threshold():
    router = PersonaRouter(FakeEmbeddingService())
    agents = [MockAgent("2", "Tech", "software react programming")]
    decisions = await router.route_input("bitcoin market", agents, threshold=0.8)
    assert decisions[0]["selected"] is False
