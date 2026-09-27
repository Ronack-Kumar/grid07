import asyncio
from app.core.db import engine, Base
from app.models import *

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(init_models())
    print("Database initialized successfully.")
