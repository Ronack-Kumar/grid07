from typing import Any, List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.api import deps
from app.models import User, Workspace, WorkspaceMember, Agent, Execution
from app.schemas import WorkspaceCreate, WorkspaceResponse

router = APIRouter()

@router.get("/", response_model=List[WorkspaceResponse])
async def read_workspaces(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    # Get workspaces where user is a member
    result = await db.execute(
        select(Workspace)
        .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
        .where(WorkspaceMember.user_id == current_user.id)
    )
    return result.scalars().all()

@router.post("/", response_model=WorkspaceResponse)
async def create_workspace(
    workspace_in: WorkspaceCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    workspace = Workspace(
        name=workspace_in.name,
        owner_id=current_user.id
    )
    db.add(workspace)
    await db.flush() # flush to get the workspace ID
    
    # Add owner as admin member
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role="Owner"
    )
    db.add(member)
    await db.commit()
    await db.refresh(workspace)
    return workspace

@router.get("/{workspace_id}/analytics")
async def get_workspace_analytics(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    # Get total agents
    agents_result = await db.execute(select(func.count()).select_from(Agent).where(Agent.workspace_id == workspace_id))
    total_agents = agents_result.scalar() or 0

    # Get total executions
    exec_result = await db.execute(select(func.count()).select_from(Execution).where(Execution.workspace_id == workspace_id))
    total_executions = exec_result.scalar() or 0

    # Get success rate
    success_result = await db.execute(select(func.count()).select_from(Execution).where(Execution.workspace_id == workspace_id, Execution.status == 'COMPLETED'))
    total_success = success_result.scalar() or 0
    success_rate = (total_success / total_executions * 100) if total_executions > 0 else 100.0

    # Get avg latency
    latency_result = await db.execute(select(func.avg(Execution.latency_ms)).where(Execution.workspace_id == workspace_id))
    avg_latency = latency_result.scalar() or 0.0

    return {
        "total_agents": total_agents,
        "total_executions": total_executions,
        "success_rate": round(success_rate, 1),
        "avg_latency_ms": round(avg_latency, 1)
    }
@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def read_workspace(
    workspace_id: uuid.UUID,
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    return workspace
