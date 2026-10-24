from sqlalchemy import inspect, text

from app.core.db import engine
from migrations import v001_provider_observability, v002_expert_routing_and_free_models, v003_user_credentials

MIGRATIONS = [v001_provider_observability, v002_expert_routing_and_free_models, v003_user_credentials]



def _run_pending(connection) -> list[str]:
    connection.execute(
        text(
            "CREATE TABLE IF NOT EXISTS schema_migrations "
            "(version VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)"
        )
    )
    applied = {row[0] for row in connection.execute(text("SELECT version FROM schema_migrations"))}
    completed = []
    tables = set(inspect(connection).get_table_names())
    for migration in MIGRATIONS:
        if migration.VERSION in applied:
            continue
        if {"agents", "executions"}.issubset(tables):
            migration.upgrade(connection)
        connection.execute(
            text("INSERT INTO schema_migrations (version) VALUES (:version)"),
            {"version": migration.VERSION},
        )
        completed.append(migration.VERSION)
    return completed


async def run_migrations() -> list[str]:
    async with engine.begin() as connection:
        return await connection.run_sync(_run_pending)
