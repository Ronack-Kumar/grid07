from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import numpy as np
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models import Agent
from app.services.personas import build_routing_text


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate cosine similarity with shape validation and zero handling."""
    if a.shape != b.shape:
        raise ValueError(f"Vector dimensions do not match: {a.shape} vs {b.shape}")
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


class CandidateScore(BaseModel):
    agent_id: str
    agent_name: str
    score: float
    semantic_score: float = 0.0
    domain_score: float = 0.0
    selected: bool = False
    threshold: Optional[float] = None
    reason: str = ""


class RoutingDecision(BaseModel):
    routing_mode: str = "automatic"  # "automatic" or "explicit"
    selected_agent_id: Optional[str] = None
    selected_agent_name: Optional[str] = None
    intent: str = "general"
    domain: str = "general"
    confidence_score: float = 0.0
    selection_reason: str = ""
    candidate_scores: List[CandidateScore] = Field(default_factory=list)
    routing_strategy: str = "semantic_hybrid"  # semantic_hybrid, conversational_continuity, general_fallback, setup_required
    needs_clarification: bool = False
    is_fallback: bool = False
    routing_latency_ms: int = 0
    conversation_id: Optional[str] = None
    calibrated_confidence: int = 0
    match_quality: str = "Uncalibrated"


DOMAIN_KEYWORDS: Dict[str, List[str]] = {
    "finance": [
        "stock", "shares", "portfolio", "roi", "equity", "dividend", "revenue",
        "fiscal", "p/e", "invest", "investing", "ebitda", "capital", "crypto", "bitcoin",
        "trading", "balance sheet", "401k", "hedge", "mortgage", "inflation",
        "tax", "valuation", "fund", "bonds", "yield", "financial", "budget", "budgeting",
        "salary", "loan", "loans", "debt", "repay", "repayment", "savings", "money",
        "personal finance", "mutual fund", "mutual funds", "sip", "interest", "credit",
        "retirement", "bank", "wealth", "asset", "cash flow", "income", "rent"
    ],
    "coding": [
        "code", "python", "bug", "traceback", "exception", "function", "javascript",
        "typescript", "class", "async", "api", "endpoint", "git", "syntax",
        "refactor", "algorithm", "compiler", "sql", "query", "database", "unittest",
        "pytest", "docker", "frontend", "backend", "react", "html", "css",
        "connection", "pooling", "worker", "asynchronous", "fastapi", "django", "flask",
        "thread", "concurrency", "optimize", "architecture", "debug", "programming",
        "rest", "grpc", "microservice", "microservices", "distributed", "protocol",
        "protobuf", "serialization", "latency", "http", "rpc"
    ],
    "cybersecurity": [
        "security", "vulnerability", "vulnerabilities", "exploit", "cve", "injection",
        "sql injection", "xss", "csrf", "malware", "firewall", "auth", "jwt",
        "phishing", "encryption", "cipher", "tls", "penetration", "soc2",
        "zero-day", "hashing", "sanitize", "threat", "defensive", "audit", "secure",
        "zero-trust", "mitigation", "authorization", "prevent", "owasp"
    ],
    "research": [
        "research", "comparative", "synthesis", "literature", "evidence", "study",
        "in-depth", "explanation", "analysis", "compare", "contrast", "survey",
        "overview", "academic", "trade-off", "trade-offs", "paper", "papers",
        "comparative summary", "framework"
    ],
    "creative": [
        "write", "story", "poem", "essay", "draft", "dialogue", "creative", "blog"
    ],
    "general": [
        "hello", "hi", "help", "who are you", "what can you do", "explain", "summarize", "general", "notes"
    ],
}


class PersonaRouter:
    """
    Intelligent Persona Routing Engine.
    Implements multi-layer candidate scoring:
    1. Active persona filtering.
    2. Intent and domain detection.
    3. Semantic vector similarity.
    4. Domain keyword alignment (from persona configuration).
    5. Conversational context continuity (avoiding thrashing across follow-up queries).
    6. Deterministic tie-breaking.
    7. Edge-case handling (setup message, fallback general persona, clarification).
    """

    def __init__(self, embedding_service):
        self.embedding_service = embedding_service

    def detect_domain_and_intent(self, text: str) -> tuple[str, str]:
        """Inexpensive deterministic intent and domain classifier."""
        lower = text.lower()
        tokens = set(re.findall(r"\b\w+\b", lower))

        best_domain = "general"
        max_matches = 0

        for domain, kws in DOMAIN_KEYWORDS.items():
            matches = sum(1 for kw in kws if kw in tokens or (" " in kw and kw in lower))
            if matches > max_matches:
                max_matches = matches
                best_domain = domain

        # Infer intent using word token boundaries to avoid false substring matches
        greeting_tokens = {"hello", "hi", "hey", "greetings", "howdy", "hiya"}
        if tokens.intersection(greeting_tokens):
            intent = "greeting"
        elif any(w in lower for w in ["fix", "debug", "error", "traceback", "why is", "deadlock"]):
            intent = "troubleshooting"
        elif any(w in lower for w in ["how to", "guide", "tutorial", "implement", "how should i"]):
            intent = "implementation"
        elif any(w in lower for w in ["analyze", "eval", "review", "audit", "compare", "comparative", "summary"]):
            intent = "analysis"
        else:
            intent = "inquiry"

        return best_domain, intent

    def _calculate_domain_overlap(self, input_text: str, agent: Agent) -> float:
        """Calculate alignment between input text and agent's defined expertise/interests."""
        input_lower = input_text.lower()
        input_tokens = set(re.findall(r"\b\w+\b", input_lower))
        if not input_tokens:
            return 0.0

        agent_terms: List[str] = []
        if getattr(agent, "expertise", None) and isinstance(agent.expertise, list):
            agent_terms.extend(agent.expertise)
        if getattr(agent, "interests", None) and isinstance(agent.interests, list):
            agent_terms.extend(agent.interests)
        if getattr(agent, "description", None):
            agent_terms.extend(re.findall(r"\b\w+\b", agent.description.lower()))
        if getattr(agent, "name", None):
            agent_terms.extend(re.findall(r"\b\w+\b", agent.name.lower()))
        if getattr(agent, "purpose", None):
            agent_terms.extend(re.findall(r"\b\w+\b", agent.purpose.lower()))

        cleaned_terms = set(term.lower().strip() for term in agent_terms if len(term.strip()) > 2)
        if not cleaned_terms:
            return 0.0

        matches = 0
        for term in cleaned_terms:
            if " " in term:
                if term in input_lower:
                    matches += 2
            elif term in input_tokens:
                matches += 1

        # Normalized overlap score capped between 0 and 1
        score = min(matches / max(len(input_tokens) * 0.4, 2.0), 1.0)
        return float(round(score, 4))

    async def route(
        self,
        input_text: str,
        agents: List[Agent],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        current_agent_id: Optional[str] = None,
        threshold: Optional[float] = None,
    ) -> RoutingDecision:
        """
        Main end-to-end automatic routing method.
        """
        start_time = time.perf_counter()
        threshold = settings.ROUTING_THRESHOLD if threshold is None else threshold
        raw_input = input_text.strip()

        # Handle empty input
        if not raw_input:
            return RoutingDecision(
                routing_mode="automatic",
                intent="empty",
                domain="general",
                confidence_score=0.0,
                selection_reason="Empty input provided.",
                needs_clarification=True,
                routing_strategy="empty_input",
                routing_latency_ms=int((time.perf_counter() - start_time) * 1000),
            )

        # Filter only enabled personas
        enabled_agents = [
            agent for agent in agents
            if getattr(agent, "is_active", True) is not False
        ]

        if not enabled_agents:
            return RoutingDecision(
                routing_mode="automatic",
                intent="unknown",
                domain="unknown",
                confidence_score=0.0,
                selection_reason="No enabled expert personas found in this workspace. Please create or enable a persona.",
                needs_clarification=False,
                routing_strategy="no_enabled_personas",
                routing_latency_ms=int((time.perf_counter() - start_time) * 1000),
            )

        detected_domain, detected_intent = self.detect_domain_and_intent(raw_input)

        # Obtain input embedding
        try:
            input_vector = await self.embedding_service.get_embedding(raw_input)
        except Exception:
            input_vector = None

        candidate_scores: List[CandidateScore] = []

        for agent in enabled_agents:
            agent_id_str = str(agent.id)
            routing_text = build_routing_text(agent)
            
            # Semantic score
            semantic_score = 0.0
            if input_vector is not None and routing_text:
                try:
                    agent_vector = await self.embedding_service.get_embedding(routing_text)
                    semantic_score = cosine_similarity(input_vector, agent_vector)
                except Exception:
                    semantic_score = 0.0

            # Domain keyword score
            domain_score = self._calculate_domain_overlap(raw_input, agent)

            # Combined score: Semantic score is primary; domain overlap provides a boost
            if input_vector is not None:
                if domain_score > 0:
                    combined_score = max(semantic_score, 0.65 * semantic_score + 0.35 * domain_score)
                else:
                    combined_score = semantic_score
            else:
                combined_score = domain_score

            # Domain synergy alignment when the detected domain strongly matches agent identity
            agent_lower = (agent.name + " " + (agent.description or "")).lower()
            domain_alignment = 0.0
            if detected_domain == "coding" and any(k in agent_lower for k in ["code", "engineer", "programming", "software"]):
                domain_alignment = 0.15
            elif detected_domain == "finance" and any(k in agent_lower for k in ["finance", "financial", "invest", "stock"]):
                domain_alignment = 0.15
            elif detected_domain == "cybersecurity" and any(k in agent_lower for k in ["security", "vulnerability", "cve"]):
                domain_alignment = 0.15
            elif detected_domain == "research" and any(k in agent_lower for k in ["research", "comparative", "synthesis"]):
                domain_alignment = 0.18
            elif detected_domain == "general" and any(k in agent_lower for k in ["general", "assistant"]):
                domain_alignment = 0.10

            combined_score = min(combined_score + domain_alignment, 1.0)

            # Conversational continuity boost
            # If the user is having an ongoing conversation and current_agent_id is this agent:
            continuity_boost = 0.0
            if current_agent_id and str(current_agent_id) == agent_id_str:
                # Only apply continuity boost if the query is a short follow-up or maintains relevance to this agent
                is_short_followup = len(raw_input.split()) < 8
                if (is_short_followup and detected_domain in {"general"}) or (domain_score > 0.15):
                    continuity_boost = 0.10
                    combined_score = min(combined_score + continuity_boost, 1.0)

            candidate_scores.append(
                CandidateScore(
                    agent_id=agent_id_str,
                    agent_name=agent.name,
                    score=round(combined_score, 4),
                    semantic_score=round(semantic_score, 4),
                    domain_score=round(domain_score, 4),
                    selected=False,
                    threshold=threshold,
                    reason="Candidate evaluated",
                )
            )

        # Deterministic tie-breaking:
        # Sort primarily by score desc, secondarily by agent name asc, tertiarily by agent id asc
        candidate_scores.sort(key=lambda c: (-c.score, c.agent_name, c.agent_id))

        top_candidate = candidate_scores[0]
        selected_agent = next((a for a in enabled_agents if str(a.id) == top_candidate.agent_id), None)

        strategy = "semantic_hybrid"
        is_fallback = False
        needs_clarification = False

        if top_candidate.score >= threshold:
            top_candidate.selected = True
            top_candidate.reason = f"Top-ranked specialist exceeding threshold ({top_candidate.score:.2f} >= {threshold:.2f})"
            selection_reason = f"Selected {top_candidate.agent_name} based on domain match and stated expertise."
            selected_id = top_candidate.agent_id
            selected_name = top_candidate.agent_name
            if top_candidate.score >= 0.28:
                calibrated = min(92 + int((top_candidate.score - 0.28) * 35), 98)
                quality = "High Confidence"
            elif top_candidate.score >= threshold:
                calibrated = 82 + int((top_candidate.score - threshold) * 100)
                quality = "Moderate Match"
            else:
                calibrated = 75
                quality = "Acceptable Match"
        else:
            # Low confidence match: look for a general-purpose persona
            general_agent = next(
                (a for a in enabled_agents if any(term in (a.name + " " + (a.description or "")).lower() for term in ["general", "assistant", "helpful", "omni"])),
                None
            )
            if general_agent:
                selected_id = str(general_agent.id)
                selected_name = general_agent.name
                is_fallback = True
                strategy = "general_fallback"
                selection_reason = f"Confidence score ({top_candidate.score:.2f}) was below threshold ({threshold:.2f}). Routed to general assistant '{general_agent.name}'."
                calibrated = 62
                quality = "General Fallback"
                # Mark selected in candidate list
                for c in candidate_scores:
                    if c.agent_id == selected_id:
                        c.selected = True
                        c.reason = "Selected as general-purpose fallback"
            else:
                selected_id = None
                selected_name = None
                needs_clarification = True
                strategy = "clarification"
                selection_reason = f"No specialist reached confidence threshold ({top_candidate.score:.2f} < {threshold:.2f}) and no general assistant is configured."
                calibrated = 35
                quality = "Low Confidence"

        # Mark non-selected candidates
        for c in candidate_scores:
            if not c.selected:
                c.reason = "Lower-ranked candidate" if top_candidate.score >= threshold else "Score below threshold"

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        return RoutingDecision(
            routing_mode="automatic",
            selected_agent_id=selected_id,
            selected_agent_name=selected_name,
            intent=detected_intent,
            domain=detected_domain,
            confidence_score=top_candidate.score,
            calibrated_confidence=calibrated,
            match_quality=quality,
            selection_reason=selection_reason,
            candidate_scores=candidate_scores,
            routing_strategy=strategy,
            needs_clarification=needs_clarification,
            is_fallback=is_fallback,
            routing_latency_ms=latency_ms,
        )

    async def route_input(
        self,
        input_text: str,
        agents: List[Agent],
        threshold: float | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Backwards-compatible interface returning list of candidate dicts.
        """
        decision = await self.route(input_text=input_text, agents=agents, threshold=threshold)
        return [
            {
                "agent_id": c.agent_id,
                "agent_name": c.agent_name,
                "score": c.score,
                "selected": c.selected,
                "threshold": c.threshold,
                "reason": c.reason,
            }
            for c in decision.candidate_scores
        ]
