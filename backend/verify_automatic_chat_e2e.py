import asyncio
import uuid
from app.core.db import AsyncSessionLocal
from app.models import Workspace, Agent, Execution, Conversation
from app.services.llm.router import build_default_llm_router
from app.services.execution_runner import run_execution
from app.services.routing.router import PersonaRouter
from app.services.routing.embeddings import EmbeddingService
from app.services.llm.registry import model_registry
from sqlalchemy import select


async def run_live_e2e():
    print("================================================================")
    print("      GRID07 AUTOMATIC EXPERT CHAT & FREE MODEL LIVE E2E       ")
    print("================================================================")

    embedding_service = EmbeddingService()
    persona_router = PersonaRouter(embedding_service=embedding_service)

    # 1. Check workspace and ensure Finance Advisor and Code Engineer exist
    async with AsyncSessionLocal() as session:
        ws_res = await session.execute(select(Workspace).limit(1))
        ws = ws_res.scalars().first()
        assert ws, "Workspace must exist"
        workspace_id = ws.id
        print(f"Active Workspace: {ws.name} ({workspace_id})")

        agents_res = await session.execute(select(Agent).where(Agent.workspace_id == workspace_id))
        agents = list(agents_res.scalars().all())
        print(f"Available Agents ({len(agents)}):")
        for a in agents:
            print(f"  - [{a.name}] (is_active={getattr(a, 'is_active', True)}, provider={a.provider}, model={a.model_name})")

    # 2. Test Turn 1: Automatic Routing on Finance Query
    print("\n--- Turn 1: User asks arbitrary question without selecting a persona ---")
    user_query_1 = "What are the primary risk metrics to evaluate in a stock dividend portfolio?"
    print(f"User Input: \"{user_query_1}\"")

    exec_id_1 = uuid.uuid4()
    conv_id = uuid.uuid4()

    async with AsyncSessionLocal() as session:
        conv = Conversation(
            id=conv_id,
            workspace_id=workspace_id,
            title="Auto Chat Live E2E",
        )
        session.add(conv)
        exec_1 = Execution(
            id=exec_id_1,
            workspace_id=workspace_id,
            agent_id=None,  # NO PERSONA SELECTED!
            conversation_id=conv_id,
            input_text=user_query_1,
            routing_mode="automatic",
            status="PENDING",
            routing_decisions={"request": {"routing_mode": "automatic"}},
        )
        session.add(exec_1)
        await session.commit()

    print("Running execution runner pipeline in automatic mode...")
    await run_execution(
        execution_id=exec_id_1,
        session_factory=AsyncSessionLocal,
        persona_router=persona_router,
        llm_router_factory=build_default_llm_router,
    )

    # Inspect Turn 1 results
    async with AsyncSessionLocal() as session:
        e1 = await session.get(Execution, exec_id_1)
        assert e1 is not None
        print(f"\nExecution 1 Terminal Status: {e1.status}")
        assert e1.status == "COMPLETED", f"Expected COMPLETED, got {e1.status}: {e1.error_message}"
        
        rd = e1.routing_decisions or {}
        decision = rd.get("decision", {})
        print(f"Selected Expert: {decision.get('selected_agent_name')} (ID: {e1.agent_id})")
        print(f"Routing Strategy: {decision.get('routing_strategy')}")
        print(f"Detected Domain: {decision.get('domain')} / Intent: {decision.get('intent')}")
        print(f"Confidence Score: {decision.get('confidence_score')}")
        print(f"Selection Reason: {decision.get('selection_reason')}")
        print(f"Actual Provider / Model: {e1.actual_provider} / {e1.actual_model}")
        print(f"Latency: {e1.latency_ms} ms")
        assert e1.actual_provider == "groq"
        assert e1.actual_model in {"openai/gpt-oss-20b", "qwen/qwen3.8-27b"}
        assert e1.output_text and len(e1.output_text) > 20
        safe_out = e1.output_text[:250].encode('ascii', errors='replace').decode()
        print(f"Assistant Output Snippet:\n  {safe_out}...")

    # 3. Test Turn 2: Follow-up question in same conversation (Conversational Continuity)
    print("\n--- Turn 2: Follow-up within same conversation (Testing Continuity) ---")
    user_query_2 = "Can you also explain the dividend payout ratio calculation?"
    print(f"User Follow-up: \"{user_query_2}\"")

    exec_id_2 = uuid.uuid4()
    async with AsyncSessionLocal() as session:
        exec_2 = Execution(
            id=exec_id_2,
            workspace_id=workspace_id,
            agent_id=None,  # Zero config
            conversation_id=conv_id,
            input_text=user_query_2,
            routing_mode="automatic",
            status="PENDING",
            routing_decisions={"request": {"routing_mode": "automatic"}},
        )
        session.add(exec_2)
        await session.commit()

    await run_execution(
        execution_id=exec_id_2,
        session_factory=AsyncSessionLocal,
        persona_router=persona_router,
        llm_router_factory=build_default_llm_router,
    )

    async with AsyncSessionLocal() as session:
        e2 = await session.get(Execution, exec_id_2)
        assert e2 is not None
        print(f"\nExecution 2 Terminal Status: {e2.status}")
        assert e2.status == "COMPLETED"
        rd2 = e2.routing_decisions or {}
        d2 = rd2.get("decision", {})
        print(f"Selected Expert: {d2.get('selected_agent_name')} (ID: {e2.agent_id})")
        print(f"Continuity Preserved: {e2.agent_id == e1.agent_id}")
        assert e2.agent_id == e1.agent_id, "Continuity should preserve the active persona on follow-up"
        print(f"Actual Model: {e2.actual_provider}/{e2.actual_model} in {e2.latency_ms}ms")

    # 4. Verify Model Registry Telemetry
    print("\n--- 4. Checking Free Model Registry Telemetry ---")
    meta = model_registry.get_model("groq", "openai/gpt-oss-20b")
    if meta:
        print(f"Model: {meta.provider_id}/{meta.model_id}")
        print(f"Eligibility: {meta.free_tier_eligibility}")
        print(f"Health Status: {meta.health_status}")
        print(f"Latency P50: {meta.latency_p50_ms} ms")
        print(f"Verified At: {meta.verified_at}")
        assert meta.health_status == "healthy"
        assert meta.free_tier_eligibility == "verified"

    # Cleanup temporary test executions and conversation
    print("\n--- 5. Clean Up Verification Rows ---")
    async with AsyncSessionLocal() as session:
        from app.models import Message
        msg_res = await session.execute(select(Message).where(Message.conversation_id == conv_id))
        for m in msg_res.scalars().all():
            await session.delete(m)
        e1_rec = await session.get(Execution, exec_id_1)
        if e1_rec:
            await session.delete(e1_rec)
        e2_rec = await session.get(Execution, exec_id_2)
        if e2_rec:
            await session.delete(e2_rec)
        c_rec = await session.get(Conversation, conv_id)
        if c_rec:
            await session.delete(c_rec)
        await session.commit()
        print("Cleaned up temporary test rows.")

    print("\n================================================================")
    print("    LIVE E2E AUTOMATIC EXPERT CHAT VERIFICATION COMPLETED!     ")
    print("================================================================")


if __name__ == "__main__":
    asyncio.run(run_live_e2e())
