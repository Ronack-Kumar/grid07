from typing import Any, List, Dict
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.api import deps
from app.models import User, Workspace, WorkspaceMember, Agent, Execution
from app.schemas import WorkspaceCreate, WorkspaceResponse
from app.services.personas import ensure_workspace_default_personas

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

    # Idempotently provision the 5 default personas
    await ensure_workspace_default_personas(workspace.id, db)

    return workspace

@router.get("/{workspace_id}/analytics")
async def get_workspace_analytics(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    # Get all agents in workspace
    agents_res = await db.execute(select(Agent).where(Agent.workspace_id == workspace_id))
    all_agents = list(agents_res.scalars().all())
    total_agents = len(all_agents)
    enabled_agents = sum(1 for a in all_agents if getattr(a, "is_active", True) is not False)

    # Get all executions in workspace
    exec_res = await db.execute(select(Execution).where(Execution.workspace_id == workspace_id))
    all_executions = list(exec_res.scalars().all())
    total_executions = len(all_executions)

    completed_execs = [e for e in all_executions if e.status == 'COMPLETED']
    failed_execs = [e for e in all_executions if e.status == 'FAILED']
    total_success = len(completed_execs)
    success_rate = (total_success / total_executions * 100) if total_executions > 0 else 100.0

    latencies = [e.latency_ms for e in all_executions if e.latency_ms is not None]
    avg_latency = (sum(latencies) / len(latencies)) if latencies else 0.0

    # Per-persona activity breakdown
    agent_map = {a.id: a.name for a in all_agents}
    persona_counts: Dict[str, Dict[str, Any]] = {}
    for a in all_agents:
        persona_counts[a.name] = {
            "agent_id": str(a.id),
            "agent_name": a.name,
            "name": a.name,
            "count": 0,
            "success": 0,
            "latencies": [],
        }

    provider_usage: Dict[str, int] = {}

    for e in all_executions:
        # Provider usage
        prov = e.actual_provider or e.requested_provider or "other"
        provider_usage[prov] = provider_usage.get(prov, 0) + 1

        # Persona breakdown
        agent_name = agent_map.get(e.agent_id) if e.agent_id else "Auto-routed"
        if agent_name not in persona_counts:
            persona_counts[agent_name] = {
                "agent_id": str(e.agent_id) if e.agent_id else f"agent-{abs(hash(agent_name))}",
                "agent_name": agent_name,
                "name": agent_name,
                "count": 0,
                "success": 0,
                "latencies": [],
            }
        persona_counts[agent_name]["count"] += 1
        if e.status == 'COMPLETED':
            persona_counts[agent_name]["success"] += 1
        if e.latency_ms:
            persona_counts[agent_name]["latencies"].append(e.latency_ms)

    persona_breakdown = []
    for p in persona_counts.values():
        p_count = p["count"]
        p_rate = (p["success"] / p_count * 100) if p_count > 0 else 100.0
        p_avg_lat = (sum(p["latencies"]) / len(p["latencies"])) if p["latencies"] else 0.0
        p_pct = round((p_count / total_executions * 100), 1) if total_executions > 0 else 0.0
        persona_breakdown.append({
            "agent_id": p.get("agent_id") or f"agent-{abs(hash(p['name']))}",
            "agent_name": p.get("agent_name", p["name"]),
            "name": p["name"],
            "count": p_count,
            "percentage": p_pct,
            "success_rate": round(p_rate, 1),
            "avg_latency_ms": round(p_avg_lat, 1),
        })

    persona_breakdown.sort(key=lambda x: -x["count"])

    return {
        "total_agents": total_agents,
        "enabled_agents": enabled_agents,
        "total_executions": total_executions,
        "success_rate": round(success_rate, 1),
        "avg_latency_ms": round(avg_latency, 1),
        "status_counts": {
            "completed": total_success,
            "failed": len(failed_execs),
            "pending": total_executions - total_success - len(failed_execs),
        },
        "provider_usage": provider_usage,
        "persona_breakdown": persona_breakdown,
    }

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def read_workspace(
    workspace_id: uuid.UUID,
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    return workspace
