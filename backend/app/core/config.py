from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_SECRET_MARKERS = ("change-me", "replace-me", "placeholder")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Resume Analyzer & Job Matcher"
    environment: Literal["development", "test", "production"] = "development"
    api_prefix: str = "/api/v1"

    database_url: str = "postgresql+psycopg://resume_app:resume_app@localhost:5432/resume_analyzer"

    secret_key: str = Field(min_length=32)
    access_token_expire_minutes: int = 60 * 12
    cookie_name: str = "ra_session"
    cookie_secure: bool = False

    # Comma-separated list of origins allowed to call the API directly.
    frontend_origins: str = "http://localhost:3000"
    frontend_base_url: str = "http://localhost:3000"

    upload_dir: Path = Path("storage/uploads")
    max_upload_mb: int = 5
    max_pdf_pages: int = 10

    ai_provider: Literal["mock", "openai"] = "mock"
    ai_api_key: str | None = None
    ai_model: str = "gpt-5-mini"
    ai_base_url: str = "https://api.openai.com/v1"
    ai_timeout_seconds: float = 60.0
    ai_max_retries: int = 1

    ai_rate_limit_per_minute: int = 5
    ai_rate_limit_per_day: int = 100
    login_rate_limit_per_minute: int = 10
    upload_rate_limit_per_hour: int = 30

    password_reset_token_minutes: int = 30

    # Outgoing email for password resets. Without SMTP_HOST, development prints reset links to the console.
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "no-reply@example.com"
    smtp_starttls: bool = True

    @field_validator("database_url")
    @classmethod
    def _use_psycopg_driver(cls, url: str) -> str:
        # Hosted Postgres providers (Neon, Render, Supabase) hand out postgres:// or postgresql:// URLs.
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix) :]
        return url

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.frontend_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def ai_is_external(self) -> bool:
        return self.ai_provider != "mock"

    @model_validator(mode="after")
    def _validate_production(self) -> "Settings":
        if self.ai_provider == "openai" and not self.ai_api_key:
            raise ValueError("AI_API_KEY is required when AI_PROVIDER=openai")
        if self.environment == "production":
            if any(m in self.secret_key.lower() for m in INSECURE_SECRET_MARKERS):
                raise ValueError("SECRET_KEY must be replaced with a strong random value in production")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
