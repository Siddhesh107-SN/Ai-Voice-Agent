"""Application settings loaded from environment variables / .env."""
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AI Calling Backend"
    app_env: str = "development"
    debug: bool = False

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/ai_calling"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    sarvam_api_key: str = ""
    sarvam_base_url: str = ""
    sarvam_webhook_secret: str = ""

    default_timezone: str = "UTC"
    cors_origins: str = ""
    rate_limit_enabled: bool = True

    @model_validator(mode="after")
    def _check_production_secrets(self) -> "Settings":
        if self.app_env == "production":
            if self.jwt_secret_key.startswith("change-me") or len(self.jwt_secret_key) < 32:
                raise ValueError("JWT_SECRET_KEY must be a strong secret (32+ chars) in production")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
