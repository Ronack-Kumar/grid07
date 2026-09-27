from typing import Any, List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models import Workspace, Agent
from app.schemas.agent import AgentCreate, AgentResponse, AgentUpdate

router = APIRouter()

@router.get("/{workspace_id}/agents", response_model=List[AgentResponse])
async def read_agents(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    result = await db.execute(select(Agent).where(Agent.workspace_id == workspace_id))
    return result.scalars().all()

@router.post("/{workspace_id}/agents", response_model=AgentResponse)
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
