import asyncio

from app.core.migrations import run_migrations


async def main() -> None:
    applied = await run_migrations()
    if applied:
        print(f"Applied migrations: {', '.join(applied)}")
    else:
        print("Database is up to date.")


if __name__ == "__main__":
    asyncio.run(main())
