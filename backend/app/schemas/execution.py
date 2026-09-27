from pydantic import BaseModel
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

class ExecutionBase(BaseModel):
    input_text: str
    conversation_id: Optional[uuid.UUID] = None

class ExecutionCreate(ExecutionBase):
    pass

class ExecutionResponse(ExecutionBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    status: str
    routing_decisions: Optional[Dict[str, Any]] = None
    retrieved_context: Optional[Dict[str, Any]] = None
    output_text: Optional[str] = None
    latency_ms: Optional[int] = None
    cost_estimate: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
