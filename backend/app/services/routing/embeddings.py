import os
import json
import numpy as np
import requests
from typing import Optional

class EmbeddingService:
    def __init__(self, provider: str = "groq", api_key: Optional[str] = None):
        self.provider = provider
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        
    async def get_embedding(self, text: str) -> np.ndarray:
        # Fallback to the original Groq-based hacky embedding if no real provider is set
        if self.provider == "groq":
            return await self._get_groq_mock_embedding(text)
        raise NotImplementedError(f"Embedding provider {self.provider} not implemented")
        
    async def _get_groq_mock_embedding(self, text: str) -> np.ndarray:
        """Original Phase 1 hacky embedding approach for backwards compatibility"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": "llama-3.1-8b-instant",
            "max_tokens": 256,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a semantic embedding engine. "
                        "When given text, respond ONLY with a JSON array of exactly 32 floats "
                        "in the range [-1, 1] that semantically represent the text. "
                        "No explanation, no markdown — raw JSON array only."
                    ),
                },
                {"role": "user", "content": f"Embed this text: {text}"},
            ],
        }
        
        # Async request via requests or httpx (using requests synchronously for now, in prod use httpx)
        # Wrapping in async for interface compatibility
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=body,
            timeout=30,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        vector = np.array(json.loads(raw.strip()), dtype=float)
        FIXED_DIM = 64
        if len(vector) >= FIXED_DIM:
            vector = vector[:FIXED_DIM]
        else:
            vector = np.pad(vector, (0, FIXED_DIM - len(vector)))
        return vector
