from typing import Any, List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models import Workspace, Conversation, Message
from app.schemas.memory import ConversationCreate, ConversationResponse, MessageCreate, MessageResponse

router = APIRouter()

@router.get("/{workspace_id}/conversations", response_model=List[ConversationResponse])
async def read_conversations(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.workspace_id == workspace_id)
        .order_by(Conversation.updated_at.desc())
    )
    return result.scalars().all()

@router.post("/{workspace_id}/conversations", response_model=ConversationResponse)
async def create_conversation(
    workspace_id: uuid.UUID,
    conv_in: ConversationCreate,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    conv = Conversation(
        workspace_id=workspace_id,
        agent_id=conv_in.agent_id,
        title=conv_in.title
    )
    db.add(conv)
    await db.commit()
    
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conv.id)
    )
    return result.scalars().first()

@router.get("/{workspace_id}/conversations/{conv_id}", response_model=ConversationResponse)
async def read_conversation(
    workspace_id: uuid.UUID,
    conv_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.workspace_id == workspace_id)
        .where(Conversation.id == conv_id)
    )
    conv = result.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@router.post("/{workspace_id}/conversations/{conv_id}/messages", response_model=MessageResponse)
async def add_message(
    workspace_id: uuid.UUID,
    conv_id: uuid.UUID,
    msg_in: MessageCreate,
    db: AsyncSession = Depends(deps.get_db),
    workspace: Workspace = Depends(deps.get_current_workspace)
) -> Any:
    msg = Message(
        conversation_id=conv_id,
        role=msg_in.role,
        content=msg_in.content
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg
