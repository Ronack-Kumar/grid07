import time
import uuid
from datetime import datetime, timezone
from typing import Callable, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import Agent, Conversation, Execution, Message, Workspace, UserCredential
from app.services.agents.orchestration import AgentExecutionGraph
from app.services.llm import LLMError, LLMRouter, build_llm_router_with_overrides
from app.services.llm.registry import model_registry
from app.services.llm.selector import model_selector
from app.services.personas import build_persona_instructions
from app.services.routing.router import PersonaRouter



async def _fail(
    db: AsyncSession,
    execution: Execution,
    started: float,
    category: str,
    message: str,
) -> None:
    execution.status = "FAILED"
    if execution.search_status is None or execution.search_status == "pending":
        execution.search_status = "failed"
    execution.error_category = category
    execution.error_message = message
    execution.output_text = message
    execution.completed_at = datetime.now(timezone.utc)
    execution.latency_ms = int((time.perf_counter() - started) * 1000)
    await db.commit()


async def run_execution(
    execution_id: uuid.UUID,
    session_factory: async_sessionmaker[AsyncSession],
    persona_router: PersonaRouter,
    llm_router_factory: Callable[[], LLMRouter],
) -> None:
    started = time.perf_counter()
    async with session_factory() as db:
        result = await db.execute(select(Execution).where(Execution.id == execution_id))
        execution = result.scalars().first()
        if not execution:
            return

        execution.status = "ROUTING"
        execution.started_at = datetime.now(timezone.utc)
        execution.error_category = None
        execution.error_message = None
        await db.commit()

        agents_result = await db.execute(select(Agent).where(Agent.workspace_id == execution.workspace_id))
        agents = list(agents_result.scalars().all())
        if not agents:
            from app.services.personas import ensure_workspace_default_personas
            agents = await ensure_workspace_default_personas(execution.workspace_id, db)
        selected_agent = None

        request_options = (execution.routing_decisions or {}).get("request", {})
        is_automatic_mode = execution.routing_mode == "automatic" or execution.agent_id is None

        # Load conversation context early so router can use history & continuity
        conversation = []
        conv: Optional[Conversation] = None
        if execution.conversation_id:
            conv_result = await db.execute(
                select(Conversation).where(
                    Conversation.id == execution.conversation_id,
                    Conversation.workspace_id == execution.workspace_id,
                )
            )
            conv = conv_result.scalars().first()
            if not conv:
                execution.search_status = "skipped"
                await _fail(db, execution, started, "invalid_conversation", "The selected conversation does not exist.")
                return
            history_result = await db.execute(
                select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at)
            )
            conversation = [
                {"role": "assistant" if message.role == "agent" else "user", "content": message.content}
                for message in history_result.scalars().all()
            ]

        if not is_automatic_mode:
            # Explicit Persona Selection (Playground or manual API call)
            selected_agent = next((agent for agent in agents if agent.id == execution.agent_id), None)
            if not selected_agent:
                execution.search_status = "skipped"
                await _fail(db, execution, started, "invalid_persona", "The selected persona does not exist.")
                return

            routing_matches = [{
                "agent_id": str(selected_agent.id),
                "agent_name": selected_agent.name,
                "score": 1.0,
                "selected": True,
                "threshold": None,
                "reason": "Explicit persona selection",
            }]
            decision_dict = {
                "routing_mode": "explicit",
                "selected_agent_id": str(selected_agent.id),
                "selected_agent_name": selected_agent.name,
                "confidence_score": 1.0,
                "selection_reason": "Explicit persona selection in Playground/Developer mode",
                "routing_strategy": "explicit",
                "needs_clarification": False,
                "is_fallback": False,
            }
        else:
            # Intelligent Automatic Persona Routing
            current_agent_str = str(conv.agent_id) if conv and conv.agent_id else None
            routing_decision = await persona_router.route(
                input_text=execution.input_text,
                agents=agents,
                conversation_history=conversation,
                current_agent_id=current_agent_str,
            )
            routing_matches = [
                {
                    "agent_id": c.agent_id,
                    "agent_name": c.agent_name,
                    "score": c.score,
                    "selected": c.selected,
                    "threshold": c.threshold,
                    "reason": c.reason,
                }
                for c in routing_decision.candidate_scores
            ]
            decision_dict = routing_decision.model_dump()
            if routing_decision.selected_agent_id:
                selected_agent = next(
                    (agent for agent in agents if str(agent.id) == routing_decision.selected_agent_id),
                    None,
                )

        if not selected_agent:
            execution.status = "COMPLETED"
            if decision_dict.get("routing_strategy") == "no_enabled_personas":
                execution.output_text = "No enabled expert personas found in this workspace. Please create or enable an expert persona."
            else:
                execution.output_text = "No persona matched this request with sufficient confidence. Select a persona explicitly or refine the prompt."
            execution.routing_decisions = {
                "mode": execution.routing_mode,
                "decision": decision_dict,
                "matches": routing_matches,
                "request": request_options,
            }
            execution.completed_at = datetime.now(timezone.utc)
            execution.latency_ms = int((time.perf_counter() - started) * 1000)
            await db.commit()
            return

        execution.agent_id = selected_agent.id
        if conv:
            conv.agent_id = selected_agent.id

        # Free-tier Model Selection & Fallback Logic
        model_selection_info = {}

        # Resolve router with personal credentials if available (Priority 1: User Personal Key -> Priority 2: Global)
        router_to_use = llm_router_factory()
        if execution.workspace_id:
            ws_res = await db.execute(select(Workspace).where(Workspace.id == execution.workspace_id))
            ws = ws_res.scalars().first()
            if ws and ws.owner_id:
                creds_res = await db.execute(select(UserCredential).where(UserCredential.user_id == ws.owner_id))
                creds = {c.provider: c for c in creds_res.scalars().all()}
                if creds:
                    router_to_use = build_llm_router_with_overrides(creds)

        if not is_automatic_mode:
            # Explicit Developer/Playground mode: test the exact persona as configured
            provider = execution.requested_provider or selected_agent.provider
            model = execution.requested_model or selected_agent.model_name
            requested_fallback = request_options.get("allow_fallback")
            if bool(execution.requested_provider or execution.requested_model):
                allow_fallback = bool(requested_fallback) if requested_fallback is not None else False
            else:
                allow_fallback = bool(requested_fallback) if requested_fallback is not None else selected_agent.allow_fallback
            fallback_provider = selected_agent.fallback_provider if allow_fallback else None
            fallback_model = selected_agent.fallback_model if allow_fallback else None
            model_selection_info = {
                "provider": provider,
                "model": model,
                "is_free_tier": True,
                "selection_reason": "Playground / Explicit persona configuration",
            }
        else:
            # Intelligent Automatic Free-Model Selection
            configured = {name for name, p in router_to_use.providers.items() if p.configured}
            requires_search = bool((selected_agent.tools or {}).get("search_enabled", True))
            task_type = decision_dict.get("domain", "general")
            
            try:
                ms = model_selector.select(
                    task_type=task_type,
                    requires_search=requires_search,
                    preferred_provider=selected_agent.provider,
                    configured_providers=configured,
                )
                provider = ms.provider
                model = ms.model
                allow_fallback = True
                fallback_provider = ms.fallback_candidates[0][0] if ms.fallback_candidates else None
                fallback_model = ms.fallback_candidates[0][1] if ms.fallback_candidates else None
                model_selection_info = {
                    "provider": ms.provider,
                    "model": ms.model,
                    "is_free_tier": ms.is_free_tier,
                    "verification_status": ms.verification_status,
                    "selection_reason": ms.selection_reason,
                    "fallback_candidates": ms.fallback_candidates,
                }
            except LLMError as exc:
                await _fail(db, execution, started, exc.category, exc.safe_message)
                return

        execution.requested_provider = provider
        execution.requested_model = model
        execution.routing_decisions = {
            "mode": execution.routing_mode,
            "decision": decision_dict,
            "matches": routing_matches,
            "model_selection": model_selection_info,
            "request": request_options,
        }
        execution.status = "RETRIEVING"
        await db.commit()

        # Append user message to conversation history
        if conv:
            db.add(Message(conversation_id=conv.id, role="user", content=execution.input_text))
            conv.updated_at = datetime.now(timezone.utc)
            await db.commit()

        state = {
            "agent_id": selected_agent.name,
            "persona": build_persona_instructions(selected_agent),
            "input_text": execution.input_text,
            "conversation": conversation,
            "provider": provider,
            "model": model,
            "allow_fallback": allow_fallback,
            "fallback_provider": fallback_provider,
            "fallback_model": fallback_model,
            "search_enabled": (selected_agent.tools or {}).get("search_enabled", True),
            "domain": decision_dict.get("domain", "general"),
            "search_query": "",
            "search_results": "",
            "search_status": "pending",
            "search_sources": [],
            "node_events": [],
            "final_output": {},
        }

        execution.status = "GENERATING"
        await db.commit()
        try:
            graph = AgentExecutionGraph(router_to_use).build()
            final_state = await graph.ainvoke(state)
            final_output = final_state.get("final_output", {})
            output_text = final_output.get("response", "").strip()
            max_chars = (selected_agent.tools or {}).get("max_response_chars")
            if isinstance(max_chars, int) and max_chars > 0:
                output_text = output_text[:max_chars]


            execution.retrieved_context = {
                "query": final_state.get("search_query", ""),
                "source_count": len(final_state.get("search_sources", [])),
                "provider": final_state.get("actual_search_provider"),
                "fallback_used": bool(final_state.get("search_fallback_used", False)),
                "reason": final_state.get("search_decision_reason", ""),
            }
            execution.search_status = final_state.get("search_status")
            execution.search_sources = final_state.get("search_sources", [])
            execution.node_events = final_state.get("node_events", [])
            execution.output_text = output_text
            execution.actual_provider = final_output.get("provider")
            execution.actual_model = final_output.get("model")
            execution.fallback_used = bool(final_output.get("fallback_used"))
            execution.status = "COMPLETED"

            # Record success in registry telemetry
            if execution.actual_provider and execution.actual_model:
                model_registry.record_success(
                    execution.actual_provider,
                    execution.actual_model,
                    int((time.perf_counter() - started) * 1000),
                )

            if execution.conversation_id:
                db.add(Message(conversation_id=execution.conversation_id, role="agent", content=output_text))
        except LLMError as exc:
            execution.actual_provider = exc.provider or provider
            execution.actual_model = exc.model or model
            model_registry.record_failure(execution.actual_provider, execution.actual_model, exc.category)
            execution.search_status = (
                "failed" if state.get("search_status") == "pending" else state.get("search_status")
            )
            failed_node = (
                "generate"
                if state.get("search_status") in {"completed", "skipped", "disabled"}
                else "decide_search"
            )
            node_events = list(state.get("node_events", []))
            node_events.append({
                "node": failed_node,
                "status": "failed",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error_category": exc.category,
                "error_message": exc.safe_message,
                "provider": exc.provider or provider,
                "model": exc.model or model,
            })
            execution.node_events = node_events
            await _fail(db, execution, started, exc.category, exc.safe_message)
            return
        except Exception as exc:
            execution.actual_provider = provider
            execution.actual_model = model
            model_registry.record_failure(provider, model, "internal_error")
            execution.search_status = (
                "failed" if state.get("search_status") == "pending" else state.get("search_status")
            )
            node_events = list(state.get("node_events", []))
            node_events.append({
                "node": "execution",
                "status": "failed",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error_category": "internal_error",
                "error_message": str(exc),
            })
            execution.node_events = node_events
            await _fail(db, execution, started, "internal_error", "The execution failed unexpectedly.")
            return

        execution.completed_at = datetime.now(timezone.utc)
        execution.latency_ms = int((time.perf_counter() - started) * 1000)
        await db.commit()
