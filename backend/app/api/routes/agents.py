from typing import Any, List
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models import Workspace, Agent, Execution
from app.schemas.agent import AgentCreate, AgentResponse, AgentTestRequest, AgentUpdate
from app.schemas.execution import ExecutionResponse
from app.api.routes.executions import run_execution_background

from app.services.personas import ensure_workspace_default_personas

router = APIRouter()

@router.get("/{workspace_id}/agents", response_model=List[AgentResponse])
async def read_agents(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    agents = await ensure_workspace_default_personas(workspace_id, db)
    return agents

@router.post("/{workspace_id}/agents", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    workspace_id: uuid.UUID,
    agent_in: AgentCreate,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    agent = Agent(
        **agent_in.model_dump(),
        workspace_id=workspace_id
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


@router.patch("/{workspace_id}/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(
    workspace_id: uuid.UUID,
    agent_id: uuid.UUID,
    agent_in: AgentUpdate,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace),
) -> Any:
    result = await db.execute(select(Agent).where(Agent.workspace_id == workspace_id, Agent.id == agent_id))
    agent = result.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    for field, value in agent_in.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)
    await db.commit()
    await db.refresh(agent)
    return agent

@router.get("/{workspace_id}/agents/{agent_id}", response_model=AgentResponse)
async def read_agent(
    workspace_id: uuid.UUID,
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    result = await db.execute(
        select(Agent)
        .where(Agent.workspace_id == workspace_id)
        .where(Agent.id == agent_id)
    )
    agent = result.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("/{workspace_id}/agents/{agent_id}/test", response_model=ExecutionResponse, status_code=status.HTTP_202_ACCEPTED)
async def test_agent(
    workspace_id: uuid.UUID,
    agent_id: uuid.UUID,
    test_in: AgentTestRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace),
) -> Any:
    result = await db.execute(select(Agent).where(Agent.workspace_id == workspace_id, Agent.id == agent_id))
    agent = result.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    execution = Execution(
        workspace_id=workspace_id,
        agent_id=agent.id,
        conversation_id=test_in.conversation_id,
        input_text=test_in.input_text,
        requested_provider=test_in.provider,
        requested_model=test_in.model,
        routing_decisions={"request": {"allow_fallback": test_in.allow_fallback}},
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)
    background_tasks.add_task(run_execution_background, execution.id)
    return execution
