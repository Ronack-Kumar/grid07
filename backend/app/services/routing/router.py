import numpy as np
from typing import List, Dict, Any
from app.models import Agent

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

class PersonaRouter:
    """
    Production Persona Router
    Evaluates incoming input against available agents.
    """
    
    def __init__(self, embedding_service):
        self.embedding_service = embedding_service
        
    async def route_input(
        self, 
        input_text: str, 
        agents: List[Agent], 
        threshold: float = 0.80
    ) -> List[Dict[str, Any]]:
        """
        Embeds the input, compares to agent personas, returns selected agents.
        """
        if not agents:
            return []
            
        # Get input embedding
        input_vector = await self.embedding_service.get_embedding(input_text)
        
        matches = []
        for agent in agents:
            # We assume agent.config or a dedicated DB column stores the persona embedding.
            # For now, we mock agent vector or embed on the fly (cache in prod!)
            persona_text = agent.persona if getattr(agent, "persona", None) else agent.description
            if not persona_text:
                continue
                
            agent_vector = await self.embedding_service.get_embedding(persona_text)
            
            sim = cosine_similarity(input_vector, agent_vector)
            
            selected = sim >= threshold
            matches.append({
                "agent_id": str(agent.id),
                "agent_name": agent.name,
                "score": round(sim, 4),
                "selected": selected,
                "threshold": threshold,
                "reason": "Cosine similarity exceeded threshold" if selected else "Score below threshold"
            })
            
        # Sort by highest score first
        matches.sort(key=lambda x: x["score"], reverse=True)
        return matches
