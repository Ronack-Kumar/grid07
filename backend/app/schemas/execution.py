from pydantic import BaseModel, ConfigDict, Field
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

class ExecutionBase(BaseModel):
    input_text: str = Field(min_length=1, max_length=12000)
    conversation_id: Optional[uuid.UUID] = None

class ExecutionCreate(ExecutionBase):
    agent_id: Optional[uuid.UUID] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    allow_fallback: Optional[bool] = None
    routing_mode: Optional[str] = None

class ExecutionResponse(ExecutionBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    status: str
    routing_mode: str = "explicit"
    routing_decisions: Optional[Dict[str, Any]] = None
    retrieved_context: Optional[Dict[str, Any]] = None
    output_text: Optional[str] = None
    latency_ms: Optional[int] = None
    cost_estimate: Optional[float] = None
    requested_provider: Optional[str] = None
    requested_model: Optional[str] = None
    actual_provider: Optional[str] = None
    actual_model: Optional[str] = None
    fallback_used: bool = False
    search_status: Optional[str] = None
    search_sources: Optional[List[Dict[str, Any]]] = None
    node_events: Optional[List[Dict[str, Any]]] = None
    error_category: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
