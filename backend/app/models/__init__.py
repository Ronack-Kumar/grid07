import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Float, JSON, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    workspaces = relationship("WorkspaceMember", back_populates="user")
    owned_workspaces = relationship("Workspace", back_populates="owner")
    credentials = relationship("UserCredential", back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="owned_workspaces")
    members = relationship("WorkspaceMember", back_populates="workspace")
    agents = relationship("Agent", back_populates="workspace")

class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String, default="Member") # Owner, Admin, Member, Viewer
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspaces")

class Agent(Base):
    __tablename__ = "agents"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"))
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    avatar: Mapped[str] = mapped_column(String, nullable=True)
    purpose: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Persona fields
    personality: Mapped[str] = mapped_column(Text, nullable=True)
    communication_style: Mapped[str] = mapped_column(Text, nullable=True)
    tone: Mapped[str] = mapped_column(String, nullable=True)
    expertise: Mapped[dict] = mapped_column(JSON, nullable=True) # List of strings
    interests: Mapped[dict] = mapped_column(JSON, nullable=True)
    avoid: Mapped[dict] = mapped_column(JSON, nullable=True)
    
    # Behavior fields
    provider: Mapped[str] = mapped_column(String, default="groq")
    model_name: Mapped[str] = mapped_column(String, default="openai/gpt-oss-20b")
    allow_fallback: Mapped[bool] = mapped_column(Boolean, default=False)
    fallback_provider: Mapped[str] = mapped_column(String, nullable=True)
    fallback_model: Mapped[str] = mapped_column(String, nullable=True)
    routing_threshold: Mapped[float] = mapped_column(Float, nullable=True)
    tools: Mapped[dict] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    workspace = relationship("Workspace", back_populates="agents")
    executions = relationship("Execution", back_populates="agent")

class Execution(Base):
    __tablename__ = "executions"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"))
    agent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agents.id"), nullable=True)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id"), nullable=True)
    
    input_text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="PENDING") # PENDING, ROUTING, RETRIEVING, GENERATING, COMPLETED, FAILED
    routing_mode: Mapped[str] = mapped_column(String, default="explicit") # 'automatic' or 'explicit'
    
    # Routing info
    routing_decisions: Mapped[dict] = mapped_column(JSON, nullable=True)
    
    # Context retrieved
    retrieved_context: Mapped[dict] = mapped_column(JSON, nullable=True)
    
    # Output
    output_text: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Observability
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=True)
    cost_estimate: Mapped[float] = mapped_column(Float, nullable=True)
    requested_provider: Mapped[str] = mapped_column(String, nullable=True)
    requested_model: Mapped[str] = mapped_column(String, nullable=True)
    actual_provider: Mapped[str] = mapped_column(String, nullable=True)
    actual_model: Mapped[str] = mapped_column(String, nullable=True)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False)
    search_status: Mapped[str] = mapped_column(String, nullable=True)
    search_sources: Mapped[dict] = mapped_column(JSON, nullable=True)
    node_events: Mapped[dict] = mapped_column(JSON, nullable=True)
    error_category: Mapped[str] = mapped_column(String, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    agent = relationship("Agent", back_populates="executions")

class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"))
    agent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agents.id"), nullable=True)
    title: Mapped[str] = mapped_column(String, default="New Conversation")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id"))
    role: Mapped[str] = mapped_column(String) # 'user' or 'agent'
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


class UserCredential(Base):
    __tablename__ = "user_credentials"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_user_provider_credential"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String, index=True)
    encrypted_api_key: Mapped[str] = mapped_column(Text)
    base_url: Mapped[str] = mapped_column(String, nullable=True)
    key_prefix: Mapped[str] = mapped_column(String, default="")
    key_suffix: Mapped[str] = mapped_column(String, default="")
    is_valid: Mapped[bool] = mapped_column(Boolean, default=False)
    last_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="credentials")

