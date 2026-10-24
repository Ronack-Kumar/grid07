from sqlalchemy import inspect, text

VERSION = "001_provider_observability"

AGENT_COLUMNS = {
    "provider": "VARCHAR DEFAULT 'groq' NOT NULL",
    "allow_fallback": "BOOLEAN DEFAULT FALSE NOT NULL",
    "fallback_provider": "VARCHAR",
    "fallback_model": "VARCHAR",
    "routing_threshold": "FLOAT",
}

EXECUTION_COLUMNS = {
    "requested_provider": "VARCHAR",
    "requested_model": "VARCHAR",
    "actual_provider": "VARCHAR",
    "actual_model": "VARCHAR",
    "fallback_used": "BOOLEAN DEFAULT FALSE NOT NULL",
    "search_status": "VARCHAR",
    "search_sources": "JSON",
    "node_events": "JSON",
    "error_category": "VARCHAR",
    "error_message": "TEXT",
    "started_at": "TIMESTAMP",
}


def _add_missing_columns(connection, table_name: str, definitions: dict[str, str]) -> None:
    existing = {column["name"] for column in inspect(connection).get_columns(table_name)}
    for column, definition in definitions.items():
        if column not in existing:
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column} {definition}"))


def upgrade(connection) -> None:
    _add_missing_columns(connection, "agents", AGENT_COLUMNS)
    _add_missing_columns(connection, "executions", EXECUTION_COLUMNS)
