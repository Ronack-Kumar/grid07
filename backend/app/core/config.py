from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "GRID07 SaaS"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "grid07"
    POSTGRES_PORT: str = "5432"
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./grid07.db"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return self.DATABASE_URL
        
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_SECRET_KEY_32_BYTES"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    CREDENTIAL_ENCRYPTION_KEY: str = ""

    @property
    def encryption_key_bytes(self) -> bytes:
        import base64
        import hashlib
        if self.CREDENTIAL_ENCRYPTION_KEY:
            # If provided, ensure it is valid 32-byte urlsafe base64 or derive
            raw = self.CREDENTIAL_ENCRYPTION_KEY.strip().encode("utf-8")
            try:
                decoded = base64.urlsafe_b64decode(raw)
                if len(decoded) == 32:
                    return raw
            except Exception:
                pass
            return base64.urlsafe_b64encode(hashlib.sha256(raw).digest())
        return base64.urlsafe_b64encode(hashlib.sha256(self.SECRET_KEY.encode("utf-8")).digest())

    
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    XAI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    OPENAI_COMPATIBLE_API_KEY: str = ""
    OPENAI_COMPATIBLE_BASE_URL: str = ""
    EXA_API_KEY: str = ""
    TAVILY_API_KEY: str = ""

    GROQ_MODELS: str = "openai/gpt-oss-20b,qwen/qwen3.8-27b,openai/gpt-oss-120b,llama-3.1-8b-instant,llama-3.3-70b-versatile"
    GEMINI_MODELS: str = "gemini-3.5-flash,gemini-3.1-flash-lite,gemini-2.0-flash,gemini-1.5-flash"
    XAI_MODELS: str = "grok-3-mini,grok-3"
    OPENAI_MODELS: str = "gpt-4.1-mini,gpt-4.1"
    OPENROUTER_MODELS: str = "nvidia/nemotron-3.5-lightning:free,liquid/lfm-2.5-2.6b:free,recursive/flint-v1.0:free,meta-llama/llama-3.3-70b-instruct:free,mistralai/mistral-small-24b-instruct-2501:free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_CATALOG_CACHE_TTL_SECONDS: int = 3600
    OPENAI_COMPATIBLE_MODELS: str = ""

    DEFAULT_LLM_PROVIDER: str = "groq"
    DEFAULT_LLM_MODEL: str = "openai/gpt-oss-20b"
    LLM_TIMEOUT_SECONDS: float = 45.0
    LLM_MAX_TOKENS: int = 768

    EMBEDDING_PROVIDER: str = "local_hash"
    EMBEDDING_MODEL: str = "local-hash-v1"
    EMBEDDING_DIMENSIONS: int = 384
    ROUTING_THRESHOLD: float = 0.12

    SEARCH_PROVIDER: str = "exa"
    SEARCH_FALLBACK_PROVIDER: str = "tavily"
    SEARCH_MAX_RESULTS: int = 5
    SEARCH_TIMEOUT_SECONDS: float = 10.0
    SEARCH_CACHE_TTL_SECONDS: int = 3600
    ENABLE_DEVELOPMENT_MOCK_SEARCH: bool = False

    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def models_for(self, provider: str) -> List[str]:
        raw = getattr(self, f"{provider.upper()}_MODELS", "")
        return [model.strip() for model in raw.split(",") if model.strip()]

    @field_validator("ROUTING_THRESHOLD")
    @classmethod
    def validate_threshold(cls, value: float) -> float:
        if not 0 <= value <= 1:
            raise ValueError("ROUTING_THRESHOLD must be between 0 and 1")
        return value
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
