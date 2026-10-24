import hashlib
import math
import re
import numpy as np
from typing import Optional

from app.core.config import settings

TOKEN_RE = re.compile(r"[a-z0-9]+")


class EmbeddingService:
    def __init__(self, provider: Optional[str] = None, dimensions: Optional[int] = None):
        self.provider = provider or settings.EMBEDDING_PROVIDER
        self.dimensions = dimensions or settings.EMBEDDING_DIMENSIONS
        
    async def get_embedding(self, text: str) -> np.ndarray:
        if self.provider == "local_hash":
            return self._get_local_hash_embedding(text)
        raise NotImplementedError(f"Embedding provider {self.provider} not implemented")
        
    def _get_local_hash_embedding(self, text: str) -> np.ndarray:
        """Deterministic feature hashing for offline routing; never calls an LLM."""
        vector = np.zeros(self.dimensions, dtype=float)
        tokens = TOKEN_RE.findall(text.lower())
        features = tokens + [f"{tokens[i]}_{tokens[i + 1]}" for i in range(max(0, len(tokens) - 1))]
        for feature in features:
            digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
            value = int.from_bytes(digest, "big")
            index = value % self.dimensions
            sign = -1.0 if value & 1 else 1.0
            vector[index] += sign * (1.0 + math.log1p(len(feature)))
        norm = np.linalg.norm(vector)
        return vector if norm == 0 else vector / norm
