from typing import List, Dict
import numpy as np

class KnowledgeBaseService:
    """
    Handles chunking and embedding of proprietary knowledge base documents.
    In a full production environment, this would use pgvector.
    For now, it stores chunks in memory or a simple JSON structure per workspace.
    """
    def __init__(self, embedding_service):
        self.embedding_service = embedding_service
        self.documents = [] # { workspace_id: ..., chunks: [{text: str, embedding: List[float]}] }

    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Simple recursive character-like text splitting."""
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk_words = words[i:i + chunk_size]
            chunks.append(" ".join(chunk_words))
            i += (chunk_size - overlap)
        return chunks

    async def add_document(self, workspace_id: str, title: str, text: str):
        chunks = self.chunk_text(text)
        embeddings = await self.embedding_service.get_embeddings(chunks)
        
        doc = {
            "workspace_id": workspace_id,
            "title": title,
            "chunks": [{"text": c, "embedding": e} for c, e in zip(chunks, embeddings)]
        }
        self.documents.append(doc)
        
    async def search_kb(self, workspace_id: str, query: str, top_k: int = 3) -> List[str]:
        query_emb = (await self.embedding_service.get_embeddings([query]))[0]
        
        results = []
        for doc in self.documents:
            if doc["workspace_id"] != str(workspace_id):
                continue
            for chunk in doc["chunks"]:
                # Cosine similarity
                sim = np.dot(query_emb, chunk["embedding"]) / (np.linalg.norm(query_emb) * np.linalg.norm(chunk["embedding"]))
                results.append((sim, chunk["text"], doc["title"]))
                
        results.sort(key=lambda x: x[0], reverse=True)
        return [f"From {r[2]}: {r[1]}" for r in results[:top_k]]
