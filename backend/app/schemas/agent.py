from pydantic import BaseModel, ConfigDict, Field, model_validator
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

class AgentBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=3, max_length=4000)
    avatar: Optional[str] = None
    purpose: Optional[str] = None
    
    personality: Optional[str] = None
    communication_style: Optional[str] = None
    tone: Optional[str] = None
    expertise: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    avoid: Optional[List[str]] = None
    
    provider: str = "groq"
    model_name: str = "openai/gpt-oss-20b"
    allow_fallback: bool = False
    fallback_provider: Optional[str] = None
    fallback_model: Optional[str] = None
    routing_threshold: Optional[float] = Field(default=None, ge=0, le=1)
    tools: Optional[Dict[str, Any]] = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_fallback(self):
        if self.allow_fallback and not (self.fallback_provider and self.fallback_model):
            raise ValueError("Fallback provider and model are required when fallback is enabled")
        return self

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, min_length=3, max_length=4000)
    avatar: Optional[str] = None
    purpose: Optional[str] = None
    personality: Optional[str] = None
    communication_style: Optional[str] = None
    tone: Optional[str] = None
    expertise: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    avoid: Optional[List[str]] = None
    provider: Optional[str] = None
    model_name: Optional[str] = None
    allow_fallback: Optional[bool] = None
    fallback_provider: Optional[str] = None
    fallback_model: Optional[str] = None
    routing_threshold: Optional[float] = Field(default=None, ge=0, le=1)
    tools: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class AgentTestRequest(BaseModel):
    input_text: str = Field(min_length=1, max_length=12000)
    conversation_id: Optional[uuid.UUID] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    allow_fallback: Optional[bool] = None

class AgentResponse(AgentBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
