from sqlalchemy import inspect, text

VERSION = "003_user_credentials"


def upgrade(connection) -> None:
    tables = set(inspect(connection).get_table_names())
    if "user_credentials" not in tables:
        connection.execute(
            text(
                """
                CREATE TABLE user_credentials (
                    id CHAR(36) PRIMARY KEY,
                    user_id CHAR(36) NOT NULL,
                    provider VARCHAR(64) NOT NULL,
                    encrypted_api_key TEXT NOT NULL,
                    base_url VARCHAR(512),
                    key_prefix VARCHAR(32) DEFAULT '' NOT NULL,
                    key_suffix VARCHAR(32) DEFAULT '' NOT NULL,
                    is_valid BOOLEAN DEFAULT 0 NOT NULL,
                    last_verified_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    CONSTRAINT uq_user_provider_credential UNIQUE (user_id, provider)
                )
                """
            )
        )
        connection.execute(
            text("CREATE INDEX IF NOT EXISTS ix_user_credentials_user_id ON user_credentials (user_id)")
        )
        connection.execute(
            text("CREATE INDEX IF NOT EXISTS ix_user_credentials_provider ON user_credentials (provider)")
        )
