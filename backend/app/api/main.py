from fastapi import APIRouter

api_router = APIRouter()
from app.api.routes import auth, workspaces, agents, executions, conversations

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(agents.router, prefix="/workspaces", tags=["agents"]) 
api_router.include_router(executions.router, prefix="/workspaces", tags=["executions"])
api_router.include_router(conversations.router, prefix="/workspaces", tags=["conversations"])
