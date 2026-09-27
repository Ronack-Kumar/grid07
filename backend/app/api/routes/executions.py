from typing import Any, List
import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
import time

from app.api import deps
from app.models import Workspace, Agent, Execution, Message, Conversation
from app.schemas.execution import ExecutionCreate, ExecutionResponse
from app.services.routing.router import PersonaRouter
from app.services.routing.embeddings import EmbeddingService

router = APIRouter()

# In production this would be injected or a singleton
embedding_service = EmbeddingService()
persona_router = PersonaRouter(embedding_service=embedding_service)

async def run_execution_background(execution_id: uuid.UUID, workspace_id: uuid.UUID, db: AsyncSession):
    # Retrieve execution
    result = await db.execute(select(Execution).where(Execution.id == execution_id))
    execution = result.scalars().first()
    if not execution:
        return
        
    start_time = time.time()
    
    # 1. Routing
    execution.status = "ROUTING"
    await db.commit()
    
    agents_result = await db.execute(select(Agent).where(Agent.workspace_id == workspace_id))
    agents = agents_result.scalars().all()
    
    routing_matches = await persona_router.route_input(execution.input_text, agents)
    execution.routing_decisions = {"matches": routing_matches}
    
    selected_agent = None
    for match in routing_matches:
        if match["selected"]:
            # Find the actual agent object
            for a in agents:
                if str(a.id) == match["agent_id"]:
                    selected_agent = a
                    break
            break
            
    if not selected_agent:
        execution.status = "COMPLETED"
        execution.output_text = "No relevant agent was found to process this request."
        execution.completed_at = datetime.utcnow()
        execution.latency_ms = int((time.time() - start_time) * 1000)
        await db.commit()
        return

    execution.agent_id = selected_agent.id
    execution.status = "RETRIEVING"
    await db.commit()
    
    # 2. Retrieval & 3. Generation
    from app.services.agents.graph import AgentExecutionGraph
    from langchain_core.messages import HumanMessage, AIMessage
    graph = AgentExecutionGraph().build()
    
    # Fetch conversation history if any
    history_messages = []
    if execution.conversation_id:
        # Save user message
        user_msg = Message(conversation_id=execution.conversation_id, role="user", content=execution.input_text)
        db.add(user_msg)
        
        # Load history
        hist = await db.execute(select(Message).where(Message.conversation_id == execution.conversation_id).order_by(Message.created_at))
        for m in hist.scalars().all():
            if m.role == "user":
                history_messages.append(HumanMessage(content=m.content))
            else:
                history_messages.append(AIMessage(content=m.content))
        await db.commit()
    
    state = {
        "agent_id": selected_agent.name,
        "persona": selected_agent.persona or selected_agent.description,
        "messages": history_messages,
        "input_text": execution.input_text,
        "search_query": "",
        "search_results": "",
        "final_output": {}
    }
    
    execution.status = "GENERATING"
    await db.commit()
    
    try:
        final_state = await graph.ainvoke(state)
        execution.retrieved_context = {"sources": final_state.get("search_results", "")}
        out_text = final_state.get("final_output", {}).get("response", "Error generating response")
        execution.output_text = out_text
        execution.status = "COMPLETED"
        
        if execution.conversation_id:
            agent_msg = Message(conversation_id=execution.conversation_id, role="agent", content=out_text)
            db.add(agent_msg)
            
    except Exception as e:
        execution.status = "FAILED"
        execution.output_text = f"Error during execution: {str(e)}"
        
    execution.completed_at = datetime.utcnow()
    execution.latency_ms = int((time.time() - start_time) * 1000)
    await db.commit()


@router.post("/{workspace_id}/executions", response_model=ExecutionResponse)
async def create_execution(
    workspace_id: uuid.UUID,
    execution_in: ExecutionCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    execution = Execution(
        workspace_id=workspace_id,
        input_text=execution_in.input_text,
        conversation_id=execution_in.conversation_id
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)
    
    # Dispatch background execution
    background_tasks.add_task(run_execution_background, execution.id, workspace_id, db)
    
    return execution

@router.get("/{workspace_id}/executions", response_model=List[ExecutionResponse])
async def list_executions(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
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
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    result = await db.execute(
        select(Execution)
        .where(Execution.workspace_id == workspace_id)
        .where(Execution.id == execution_id)
    )
    exec = result.scalars().first()
    if not exec:
        raise HTTPException(status_code=404, detail="Execution not found")
    return exec
