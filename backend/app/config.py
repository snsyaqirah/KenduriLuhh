from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_ENDPOINT: str = "https://kenduriluhh-ai-service.openai.azure.com/"
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4o-kenduri"
    AZURE_OPENAI_API_VERSION: str = "2025-01-01-preview"

    # Stored as comma-separated string; use cors_origins_list property
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    SESSION_TTL_SECONDS: int = 3600
    MAX_PAX: int = 5000

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
