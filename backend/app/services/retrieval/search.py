from __future__ import annotations

import asyncio
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

import httpx

from app.core.config import settings


class SearchError(RuntimeError):
    def __init__(
        self,
        message: str,
        category: str = "search_error",
        *,
        provider: Optional[str] = None,
        retryable: bool = False,
    ):
        super().__init__(message)
        self.safe_message = message
        self.category = category
        self.provider = provider
        self.retryable = retryable


@dataclass
class SearchOutcome:
    status: str
    query: str
    results: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None
    provider: Optional[str] = None
    fallback_used: bool = False
    cached: bool = False

    @property
    def context(self) -> str:
        if not self.results:
            return ""
        blocks = []
        for index, result in enumerate(self.results):
            prov_str = f" ({result.get('provider')})" if result.get("provider") else ""
            date_str = f"\nPublished: {result.get('published_date')}" if result.get("published_date") else ""
            blocks.append(
                f"[UNTRUSTED SOURCE {index + 1}{prov_str}]\n"
                f"Title: {result.get('title', '')}\n"
                f"Content: {result.get('content', '')}\n"
                f"URL: {result.get('url', '')}{date_str}"
            )
        return "\n\n".join(blocks)


class SearchProvider:
    name: str = "base"

    @property
    def configured(self) -> bool:
        return True

    async def search(self, query: str) -> List[Dict[str, Any]]:
        raise NotImplementedError


class MockSearchProvider(SearchProvider):
    name = "mock"

    def __init__(self):
        self.mock_db = {
            "grpc": {
                "title": "Architecture Guide: High-Performance gRPC Communication",
                "content": "gRPC utilizes HTTP/2 multiplexing, Protocol Buffers binary serialization, and bidirectional streaming for low-latency microservice RPC communication.",
                "url": "https://grpc.io/docs/guides/architecture",
                "provider": "mock",
            },
            "rest": {
                "title": "Comparative Evaluation: REST vs gRPC in Microservice Architectures",
                "content": "REST architectures utilize stateless HTTP semantics and JSON representations for broad interoperability, whereas gRPC offers up to 7x lower latency in high-throughput distributed systems.",
                "url": "https://eng.example.com/distributed-rpc-benchmarks",
                "provider": "mock",
            },
            "architecture": {
                "title": "Distributed Systems Architecture & RPC Protocol Trade-offs",
                "content": "Modern distributed architectures balance loose coupling, latency budgets, protocol serialization overhead, and network partition resilience.",
                "url": "https://martinfowler.com/articles/distributed-systems.html",
                "provider": "mock",
            },
            "async": {
                "title": "Python AsyncIO Database Worker & Connection Pool Optimization",
                "content": "Asynchronous database connection pooling maintains reusable open connections, minimizes connection checkout latency, and prevents thread pool starvation under concurrent load.",
                "url": "https://docs.sqlalchemy.org/en/20/core/pooling.html",
                "provider": "mock",
            },
            "injection": {
                "title": "OWASP Prevention Guide: SQL Injection & Input Validation",
                "content": "Defensive SQL injection prevention requires parameterized queries, ORM boundary validation, and strict sanitization of dynamic clauses.",
                "url": "https://owasp.org/www-community/attacks/SQL_Injection",
                "provider": "mock",
            },
            "budget": {
                "title": "Personal Finance & Budgeting Strategy Guide",
                "content": "Structured personal budgeting guidelines recommend allocating 50/30/20 across fixed obligations, accelerated debt repayment, and liquid emergency reserves.",
                "url": "https://finance.example.com/budgeting-basics",
                "provider": "mock",
            },
            "loan": {
                "title": "Loan Repayment & Debt Elimination Framework",
                "content": "Systematic loan repayment strategies compare debt avalanche (minimizing total interest paid) against debt snowball (maximizing behavioral momentum).",
                "url": "https://finance.example.com/debt-repayment",
                "provider": "mock",
            },
            "invest": {
                "title": "How to Invest ₹1,000 in Mutual Funds and SIPs",
                "content": "Systematic investment plans (SIPs) in low-cost broad index funds offer disciplined equity accumulation and rupee-cost averaging for initial retail investors.",
                "url": "https://finance.example.com/sip-guide",
                "provider": "mock",
            },
            "crypto": {
                "title": "Cryptocurrency Market Dynamics & Layer-2 Scaling",
                "content": "Bitcoin and Ethereum Layer-2 rollup protocols demonstrate institutional capital inflows and increased network settlement volume.",
                "url": "https://finance.example.com/crypto",
                "provider": "mock",
            },
            "dividend": {
                "title": "Dividend Portfolio Risk Analysis & Capital Allocation",
                "content": "High dividend equity strategies require thorough analysis of payout ratios, free cash flow coverage, and cyclical industry exposure.",
                "url": "https://finance.example.com/dividend-risk",
                "provider": "mock",
            },
            "petrol": {
                "title": "Current Fuel Prices & Regional Retail Rates",
                "content": "Retail petrol and diesel rates are updated daily across metropolitan centers by national oil marketing companies.",
                "url": "https://fuelprices.example.com/retail-rates",
                "provider": "mock",
            },
            "gold": {
                "title": "Live Bullion Rates: 24K and 22K Gold Price Index",
                "content": "Spot gold prices reflect international bullion spot movements, dollar exchange adjustments, and import duty tariffs.",
                "url": "https://bullion.example.com/gold-today",
                "provider": "mock",
            },
            "silver": {
                "title": "Spot Silver Rates & Industrial Demand Indices",
                "content": "Silver prices fluctuate based on physical industrial demand in electronics and photovoltaic solar manufacturing.",
                "url": "https://bullion.example.com/silver-today",
                "provider": "mock",
            },
            "default": {
                "title": "Market Outlook & Industry Synthesis",
                "content": "Markets reflect measured macroeconomic conditions with institutional focus on fundamental productivity gains and risk management.",
                "url": "https://finance.example.com/outlook",
                "provider": "mock",
            },
        }

    async def search(self, query: str) -> List[Dict[str, Any]]:
        q = query.lower()
        results = []
        for kw, data in self.mock_db.items():
            if kw != "default" and kw in q:
                results.append(dict(data))
        if results:
            return results
        return [dict(self.mock_db["default"])]


class ExaSearchProvider(SearchProvider):
    name = "exa"

    def __init__(
        self,
        api_key: Optional[str] = None,
        max_results: Optional[int] = None,
        timeout: Optional[float] = None,
    ):
        self.api_key = api_key if api_key is not None else settings.EXA_API_KEY
        self.max_results = max_results or settings.SEARCH_MAX_RESULTS
        self.timeout = timeout or settings.SEARCH_TIMEOUT_SECONDS

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def search(self, query: str) -> List[Dict[str, Any]]:
        if not self.configured:
            raise SearchError(
                "EXA_API_KEY is not configured.",
                category="configuration",
                provider=self.name,
                retryable=False,
            )

        headers = {
            "x-api-key": self.api_key.strip(),
            "Content-Type": "application/json",
        }
        payload = {
            "query": query,
            "numResults": self.max_results,
            "type": "auto",
            "contents": {
                "highlights": {"numSentences": 3, "highlightsPerUrl": 1},
                "text": {"maxCharacters": 1000},
            },
        }

        max_retries = 2
        base_backoff = 0.5
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post("https://api.exa.ai/search", headers=headers, json=payload)

                if response.is_error:
                    status_code = response.status_code
                    if status_code in {401, 403}:
                        category = "authentication"
                        msg = "Exa authentication failed. Check EXA_API_KEY."
                        retryable = False
                    elif status_code == 429:
                        category = "rate_limit"
                        msg = "Exa rate limit exceeded."
                        retryable = True
                    elif status_code == 402:
                        category = "quota"
                        msg = "Exa quota exceeded or credit depleted."
                        retryable = False
                    elif status_code >= 500:
                        category = "provider_unavailable"
                        msg = f"Exa server error ({status_code})."
                        retryable = True
                    else:
                        category = "provider_error"
                        msg = f"Exa search rejected with status {status_code}."
                        retryable = False
                    last_error = SearchError(msg, category=category, provider=self.name, retryable=retryable)
                else:
                    data = response.json()
                    raw_results = data.get("results")
                    if not isinstance(raw_results, list):
                        return []

                    normalized = []
                    seen_urls: Set[str] = set()
                    for item in raw_results:
                        if not isinstance(item, dict):
                            continue
                        url = (item.get("url") or "").strip()
                        if not url or not (url.startswith("http://") or url.startswith("https://")):
                            continue
                        if url in seen_urls:
                            continue
                        seen_urls.add(url)

                        title = (item.get("title") or "").strip() or "Untitled Web Source"
                        # Prioritize highlight snippets, fallback to clean text
                        content = ""
                        highlights = item.get("highlights")
                        if isinstance(highlights, list) and highlights:
                            content = " ".join(str(h).strip() for h in highlights if h)
                        if not content:
                            content = (item.get("text") or "").strip()[:1000]

                        pub_date = item.get("publishedDate") or item.get("published_date")

                        normalized.append({
                            "title": title,
                            "url": url,
                            "content": content,
                            "published_date": pub_date,
                            "provider": self.name,
                        })

                    return normalized

            except httpx.TimeoutException:
                last_error = SearchError("Exa search timed out.", category="timeout", provider=self.name, retryable=True)
            except httpx.HTTPError as exc:
                last_error = SearchError(f"Exa search network error: {type(exc).__name__}", category="provider_unavailable", provider=self.name, retryable=True)
            except Exception as exc:
                last_error = SearchError(f"Exa search processing error: {exc}", category="provider_error", provider=self.name, retryable=False)

            if not last_error.retryable or attempt >= max_retries:
                raise last_error
            await asyncio.sleep(base_backoff * (2 ** attempt))

        raise last_error


class TavilySearchProvider(SearchProvider):
    name = "tavily"

    def __init__(
        self,
        api_key: Optional[str] = None,
        max_results: Optional[int] = None,
        timeout: Optional[float] = None,
    ):
        self.api_key = api_key if api_key is not None else settings.TAVILY_API_KEY
        self.max_results = max_results or settings.SEARCH_MAX_RESULTS
        self.timeout = timeout or settings.SEARCH_TIMEOUT_SECONDS

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def search(self, query: str) -> List[Dict[str, Any]]:
        if not self.configured:
            raise SearchError(
                "TAVILY_API_KEY is not configured.",
                category="configuration",
                provider=self.name,
                retryable=False,
            )

        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json",
        }
        payload = {
            "query": query,
            "max_results": self.max_results,
            "search_depth": "basic",
            "include_answer": False,
            "include_raw_content": False,
        }

        max_retries = 2
        base_backoff = 0.5
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post("https://api.tavily.com/search", headers=headers, json=payload)

                if response.is_error:
                    status_code = response.status_code
                    if status_code in {401, 403}:
                        category = "authentication"
                        msg = "Tavily authentication failed. Check TAVILY_API_KEY."
                        retryable = False
                    elif status_code == 429:
                        category = "rate_limit"
                        msg = "Tavily rate limit exceeded."
                        retryable = True
                    elif status_code in {402, 432}:
                        category = "quota"
                        msg = "Tavily quota exceeded or credits depleted."
                        retryable = False
                    elif status_code >= 500:
                        category = "provider_unavailable"
                        msg = f"Tavily server error ({status_code})."
                        retryable = True
                    else:
                        category = "provider_error"
                        msg = f"Tavily search rejected with status {status_code}."
                        retryable = False
                    last_error = SearchError(msg, category=category, provider=self.name, retryable=retryable)
                else:
                    data = response.json()
                    raw_results = data.get("results")
                    if not isinstance(raw_results, list):
                        return []

                    normalized = []
                    seen_urls: Set[str] = set()
                    for item in raw_results:
                        if not isinstance(item, dict):
                            continue
                        url = (item.get("url") or "").strip()
                        if not url or not (url.startswith("http://") or url.startswith("https://")):
                            continue
                        if url in seen_urls:
                            continue
                        seen_urls.add(url)

                        title = (item.get("title") or "").strip() or "Untitled Web Source"
                        content = (item.get("content") or "").strip()[:1000]
                        pub_date = item.get("published_date") or item.get("publishedDate")

                        normalized.append({
                            "title": title,
                            "url": url,
                            "content": content,
                            "published_date": pub_date,
                            "provider": self.name,
                        })

                    return normalized

            except httpx.TimeoutException:
                last_error = SearchError("Tavily search timed out.", category="timeout", provider=self.name, retryable=True)
            except httpx.HTTPError as exc:
                last_error = SearchError(f"Tavily search network error: {type(exc).__name__}", category="provider_unavailable", provider=self.name, retryable=True)
            except Exception as exc:
                last_error = SearchError(f"Tavily search processing error: {exc}", category="provider_error", provider=self.name, retryable=False)

            if not last_error.retryable or attempt >= max_retries:
                raise last_error
            await asyncio.sleep(base_backoff * (2 ** attempt))

        raise last_error


class DisabledSearchProvider(SearchProvider):
    name = "disabled"

    @property
    def configured(self) -> bool:
        return False

    async def search(self, query: str) -> List[Dict[str, Any]]:
        del query
        raise SearchError("External search is not configured.", "configuration", provider=self.name)


class SearchCache:
    """
    Thread-safe in-memory cache for search queries with normalized keys and TTL expiration.
    Guarantees thread safety under concurrent requests and never stores failed searches.
    """
    def __init__(self, ttl_seconds: Optional[int] = None):
        self.ttl_seconds = ttl_seconds if ttl_seconds is not None else settings.SEARCH_CACHE_TTL_SECONDS
        self._cache: Dict[str, Tuple[float, List[Dict[str, Any]], str, bool]] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def normalize_query(query: str) -> str:
        q = query.strip().lower()
        return re.sub(r"\s+", " ", q)

    async def get(self, query: str) -> Optional[Tuple[List[Dict[str, Any]], str, bool]]:
        key = self.normalize_query(query)
        if not key:
            return None
        async with self._lock:
            entry = self._cache.get(key)
            if not entry:
                return None
            timestamp, results, provider, fallback_used = entry
            if time.time() - timestamp > self.ttl_seconds:
                del self._cache[key]
                return None
            return list(results), provider, fallback_used

    async def set(
        self,
        query: str,
        results: List[Dict[str, Any]],
        provider: str,
        fallback_used: bool,
    ) -> None:
        key = self.normalize_query(query)
        if not key or not results:
            return
        async with self._lock:
            self._cache[key] = (time.time(), list(results), provider, fallback_used)

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()


STOPWORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with", "by", "about",
    "is", "are", "was", "were", "what", "how", "why", "when", "where", "can", "should",
    "do", "does", "of", "from", "it", "this", "that", "i", "me", "my", "you", "your",
}

DOMAIN_NEGATIVE_KEYWORDS: Dict[str, List[str]] = {
    "finance": [
        "file explorer", "windows 10", "windows 11", "start menu", "taskbar", "blue screen",
        "registry editor", "device manager", "cortana", "windows update error", "sysprep",
    ],
    "coding": [
        "horoscope", "astrology", "diet plan", "recipe", "celebrity gossip",
    ],
    "cybersecurity": [
        "cookware", "weight loss", "file explorer shortcut", "recipe", "celebrity",
    ],
}


def tokenize(text: str) -> Set[str]:
    words = re.findall(r"\b[a-zA-Z0-9_\u20B9$€£]{2,}\b", text.lower())
    return {w for w in words if w not in STOPWORDS}


class RetrievalService:
    """
    Unified retrieval orchestrator with:
    - Primary provider (Exa) and automatic secondary fallback (Tavily).
    - Thread-safe normalized query caching with TTL.
    - Strict domain and negative-keyword relevance filtering.
    - Truthful source attribution and failure categorization.
    """
    def __init__(
        self,
        search_provider: Optional[SearchProvider] = None,
        fallback_provider: Optional[SearchProvider] = None,
        cache: Optional[SearchCache] = None,
    ):
        self.cache = cache or SearchCache()

        if search_provider:
            self.primary_provider = search_provider
            self.fallback_provider = fallback_provider
        elif settings.ENABLE_DEVELOPMENT_MOCK_SEARCH:
            self.primary_provider = MockSearchProvider()
            self.fallback_provider = None
        else:
            # Build Exa as primary, Tavily as fallback (configurable via settings)
            if settings.SEARCH_PROVIDER == "exa":
                self.primary_provider = ExaSearchProvider()
            elif settings.SEARCH_PROVIDER == "tavily":
                self.primary_provider = TavilySearchProvider()
            else:
                self.primary_provider = DisabledSearchProvider()

            if settings.SEARCH_FALLBACK_PROVIDER == "tavily":
                self.fallback_provider = TavilySearchProvider()
            elif settings.SEARCH_FALLBACK_PROVIDER == "exa":
                self.fallback_provider = ExaSearchProvider()
            else:
                self.fallback_provider = None

    # Backward-compatibility alias for test assertions expecting self.search_provider
    @property
    def search_provider(self) -> SearchProvider:
        return self.primary_provider

    def filter_and_rank_results(
        self,
        raw_results: List[Dict[str, Any]],
        query: str,
        original_query: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if not raw_results:
            return []

        full_context = f"{query} {original_query or ''}".strip().lower()
        context_tokens = tokenize(full_context)

        inferred_domain = domain
        if not inferred_domain:
            if any(t in full_context for t in ("invest", "portfolio", "dividend", "stock", "fund", "money", "₹", "rupee", "finance", "petrol", "gold", "silver")):
                inferred_domain = "finance"
            elif any(t in full_context for t in ("python", "async", "sql", "code", "bug", "endpoint", "fastapi")):
                inferred_domain = "coding"
            elif any(t in full_context for t in ("cve", "vulnerability", "csrf", "security", "threat", "injection")):
                inferred_domain = "cybersecurity"

        negative_keywords = DOMAIN_NEGATIVE_KEYWORDS.get(inferred_domain or "", [])

        scored_results = []
        for res in raw_results:
            title = (res.get("title") or "").strip()
            content = (res.get("content") or "").strip()
            url = (res.get("url") or "").strip()
            res_text = f"{title} {content}".lower()

            if negative_keywords:
                has_negative = any(neg in res_text for neg in negative_keywords)
                asked_negative = any(neg in full_context for neg in negative_keywords)
                if has_negative and not asked_negative:
                    continue

            res_tokens = tokenize(res_text)
            if not res_tokens:
                continue

            overlap = context_tokens.intersection(res_tokens)
            if not overlap and context_tokens:
                if inferred_domain:
                    continue
                score = 0.1
            else:
                score = len(overlap) / max(len(context_tokens), 1)

            scored_results.append((score, {
                "title": title,
                "content": content,
                "url": url,
                "published_date": res.get("published_date"),
                "provider": res.get("provider"),
            }))

        scored_results.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_results]

    async def _execute_search_chain(self, query: str) -> Tuple[List[Dict[str, Any]], str, bool]:
        """
        Executes primary search with fallback policy:
        1. Attempt Exa if configured.
        2. If Exa fails with recoverable failure (or auth error when fallback exists), attempt Tavily.
        3. If Exa is not configured, run Tavily as primary.
        4. If neither is available, raise SearchError.
        """
        primary = self.primary_provider
        fallback = self.fallback_provider

        # Check if primary is configured
        if primary and primary.configured:
            try:
                raw = await primary.search(query)
                return raw, getattr(primary, "name", "primary"), False
            except SearchError as primary_err:
                # If fallback is configured, attempt fallback
                if fallback and fallback.configured and getattr(fallback, "name", "") != getattr(primary, "name", ""):
                    try:
                        raw = await fallback.search(query)
                        return raw, getattr(fallback, "name", "fallback"), True
                    except SearchError as fallback_err:
                        raise SearchError(
                            f"Primary search ({primary.name}) failed: {primary_err.safe_message}. Fallback ({fallback.name}) also failed: {fallback_err.safe_message}",
                            category="provider_unavailable",
                            provider=fallback.name,
                        ) from fallback_err
                # No fallback available or fallback unconfigured
                raise primary_err

        # Primary not configured; check fallback
        if fallback and fallback.configured:
            raw = await fallback.search(query)
            return raw, getattr(fallback, "name", "fallback"), False

        # Neither is configured
        raise SearchError("External search is not configured.", category="configuration")

    async def retrieve(
        self,
        query: str,
        original_query: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> SearchOutcome:
        clean_query = query.strip()
        if not clean_query:
            return SearchOutcome(status="skipped", query=query)

        # 1. Check cache
        cached_entry = await self.cache.get(clean_query)
        if cached_entry:
            cached_results, cached_provider, cached_fallback = cached_entry
            filtered = self.filter_and_rank_results(
                cached_results,
                query=clean_query,
                original_query=original_query,
                domain=domain,
            )
            if not filtered:
                return SearchOutcome(
                    status="no_relevant_sources",
                    query=clean_query,
                    results=[],
                    provider=cached_provider,
                    fallback_used=cached_fallback,
                    cached=True,
                )
            return SearchOutcome(
                status="completed",
                query=clean_query,
                results=filtered,
                provider=cached_provider,
                fallback_used=cached_fallback,
                cached=True,
            )

        # 2. Execute live search chain
        try:
            raw_results, actual_provider, fallback_used = await self._execute_search_chain(clean_query)

            filtered = self.filter_and_rank_results(
                raw_results,
                query=clean_query,
                original_query=original_query,
                domain=domain,
            )

            # Cache raw results on successful provider response
            if raw_results:
                await self.cache.set(clean_query, raw_results, actual_provider, fallback_used)

            if not filtered:
                return SearchOutcome(
                    status="no_relevant_sources",
                    query=clean_query,
                    results=[],
                    provider=actual_provider,
                    fallback_used=fallback_used,
                )

            return SearchOutcome(
                status="completed",
                query=clean_query,
                results=filtered,
                provider=actual_provider,
                fallback_used=fallback_used,
            )

        except SearchError as exc:
            return SearchOutcome(
                status=exc.category,
                query=clean_query,
                error=exc.safe_message,
                provider=exc.provider,
            )
        except Exception as exc:
            return SearchOutcome(
                status="provider_unavailable",
                query=clean_query,
                error=f"Search service error: {exc}",
            )

    async def retrieve_context(
        self,
        query: str,
        original_query: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> str:
        return (await self.retrieve(query, original_query=original_query, domain=domain)).context
