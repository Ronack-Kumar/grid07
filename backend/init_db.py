import asyncio
from app.core.db import engine, Base
from app.models import *
from app.core.migrations import run_migrations

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await run_migrations()

if __name__ == "__main__":
    asyncio.run(init_models())
    print("Database initialized successfully.")
