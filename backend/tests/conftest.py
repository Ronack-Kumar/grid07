import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api import deps
from app.api.routes import executions
from app.core.db import Base
from app.main import app
from app.services.llm import LLMResponse, LLMRouter


class RecordingProvider:
    name = "groq"
    models = ["test-model"]
    configured = True

    def __init__(self):
        self.requests = []
        self.error = None

    async def generate(self, request):
        self.requests.append(request)
        if self.error:
            raise self.error
        return LLMResponse(
            content="Generated response from persisted persona",
            provider=self.name,
            model=request.model,
            latency_ms=3,
        )


@pytest_asyncio.fixture
async def api_context(tmp_path, monkeypatch):
    database_path = (tmp_path / "test.db").as_posix()
    engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    provider = RecordingProvider()
    llm_router = LLMRouter({"groq": provider})
    app.dependency_overrides[deps.get_db] = override_get_db
    monkeypatch.setattr(executions, "AsyncSessionLocal", session_factory)
    monkeypatch.setattr(executions, "build_default_llm_router", lambda: llm_router)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield {"client": client, "provider": provider}

    app.dependency_overrides.clear()
    await engine.dispose()
