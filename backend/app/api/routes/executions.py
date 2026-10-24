from typing import Any, List
import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models import Workspace, Agent, Execution, Conversation
from app.schemas.execution import ExecutionCreate, ExecutionResponse
from app.core.db import AsyncSessionLocal
from app.services.execution_runner import run_execution
from app.services.llm import build_default_llm_router
from app.services.routing.router import PersonaRouter
from app.services.routing.embeddings import EmbeddingService

router = APIRouter()

# Module-level singletons; overridden in tests via monkeypatch
embedding_service = EmbeddingService()
persona_router = PersonaRouter(embedding_service=embedding_service)


async def run_execution_background(execution_id: uuid.UUID) -> None:
    """Dispatch point for FastAPI BackgroundTasks; delegates to execution_runner."""
    await run_execution(
        execution_id,
        session_factory=AsyncSessionLocal,
        persona_router=persona_router,
        llm_router_factory=build_default_llm_router,
    )


@router.post("/{workspace_id}/executions", response_model=ExecutionResponse)
async def create_execution(
    workspace_id: uuid.UUID,
    execution_in: ExecutionCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace),
) -> Any:
    if execution_in.agent_id:
        agent_result = await db.execute(
            select(Agent).where(Agent.id == execution_in.agent_id, Agent.workspace_id == workspace_id)
        )
        if not agent_result.scalars().first():
            raise HTTPException(status_code=404, detail="Agent not found")
    if execution_in.conversation_id:
        conversation_result = await db.execute(
            select(Conversation).where(
                Conversation.id == execution_in.conversation_id,
                Conversation.workspace_id == workspace_id,
            )
        )
        if not conversation_result.scalars().first():
            raise HTTPException(status_code=404, detail="Conversation not found")

    routing_mode = execution_in.routing_mode or ("explicit" if execution_in.agent_id else "automatic")

    execution = Execution(
        workspace_id=workspace_id,
        input_text=execution_in.input_text,
        conversation_id=execution_in.conversation_id,
        agent_id=execution_in.agent_id,
        routing_mode=routing_mode,
        requested_provider=execution_in.provider,
        requested_model=execution_in.model,
        routing_decisions={"request": {"allow_fallback": execution_in.allow_fallback, "routing_mode": routing_mode}},
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)

    background_tasks.add_task(run_execution_background, execution.id)

    return execution


@router.get("/{workspace_id}/executions", response_model=List[ExecutionResponse])
async def list_executions(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace),
) -> Any:
    result = await db.execute(
        select(Execution)
        .where(Execution.workspace_id == workspace_id)
        .order_by(Execution.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{workspace_id}/executions/{execution_id}", response_model=ExecutionResponse)
async def get_execution(
    workspace_id: uuid.UUID,
    execution_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace),
) -> Any:
    result = await db.execute(
        select(Execution)
        .where(Execution.workspace_id == workspace_id)
        .where(Execution.id == execution_id)
    )
    execution = result.scalars().first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution
