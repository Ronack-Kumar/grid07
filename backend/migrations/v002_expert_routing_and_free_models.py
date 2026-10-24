from sqlalchemy import inspect, text

VERSION = "002_expert_routing_and_free_models"

AGENT_COLUMNS = {
    "is_active": "BOOLEAN DEFAULT TRUE NOT NULL",
}

EXECUTION_COLUMNS = {
    "routing_mode": "VARCHAR DEFAULT 'explicit' NOT NULL",
}


def _add_missing_columns(connection, table_name: str, definitions: dict[str, str]) -> None:
    existing = {column["name"] for column in inspect(connection).get_columns(table_name)}
    for column, definition in definitions.items():
        if column not in existing:
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column} {definition}"))


def upgrade(connection) -> None:
    _add_missing_columns(connection, "agents", AGENT_COLUMNS)
    _add_missing_columns(connection, "executions", EXECUTION_COLUMNS)
