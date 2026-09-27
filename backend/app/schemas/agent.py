from pydantic import BaseModel
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

class AgentBase(BaseModel):
    name: str
    description: str
    avatar: Optional[str] = None
    purpose: Optional[str] = None
    
    personality: Optional[str] = None
    communication_style: Optional[str] = None
    tone: Optional[str] = None
    expertise: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    avoid: Optional[List[str]] = None
    
    model_name: str = "llama-3.1-8b-instant"
    tools: Optional[Dict[str, Any]] = None

class AgentCreate(AgentBase):
    pass

class AgentUpdate(AgentBase):
    pass

class AgentResponse(AgentBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
