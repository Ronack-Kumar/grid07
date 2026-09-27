from typing import List, Dict, Any

class SearchProvider:
    async def search(self, query: str) -> List[Dict[str, str]]:
        raise NotImplementedError

class MockSearchProvider(SearchProvider):
    def __init__(self):
        self.mock_db = {
            "crypto": "Bitcoin hits new all-time high amid regulatory ETF approvals; Ethereum Layer-2 volume surges 400%.",
            "ai": "OpenAI releases GPT-5 with real-time reasoning; Anthropic Claude 4 beats benchmarks across the board.",
            "tech": "Big Tech stocks rally as Fed signals rate cuts; NVIDIA leads with +8% single-day gain.",
            "default": "Markets mixed as geopolitical tensions weigh on risk sentiment; tech outperforms.",
        }

    async def search(self, query: str) -> List[Dict[str, str]]:
        q = query.lower()
        for kw, headline in self.mock_db.items():
            if kw in q:
                return [{"title": headline, "content": headline, "url": "mock://news"}]
        return [{"title": self.mock_db["default"], "content": self.mock_db["default"], "url": "mock://default"}]

class DDGSearchProvider(SearchProvider):
    async def search(self, query: str) -> List[Dict[str, str]]:
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=5))
                return [
                    {"title": r.get("title", ""), "content": r.get("body", ""), "url": r.get("href", "")}
                    for r in results
                ]
        except ImportError:
            print("duckduckgo-search not installed. Falling back to mock.")
            return await MockSearchProvider().search(query)
        except Exception as e:
            print(f"DDG Search error: {e}")
            return await MockSearchProvider().search(query)

class RetrievalService:
    """
    Handles fetching and ranking of information from external sources or knowledge bases.
    """
    def __init__(self, search_provider: SearchProvider = None):
        # Default to real web search
        self.search_provider = search_provider or DDGSearchProvider()
        
    async def retrieve_context(self, query: str) -> str:
        results = await self.search_provider.search(query)
        # Format results for the context window
        context = []
        for i, res in enumerate(results):
            context.append(f"Source {i+1}: {res['title']}\n{res['content']}\nURL: {res['url']}\n")
        return "\n".join(context)
