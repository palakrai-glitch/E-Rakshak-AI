"""
Centralised application configuration for E-Rakshak AI backend.

All configurable values are read from environment variables (via a .env file
during development).  Secrets must never be hard-coded here.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings resolved from environment variables."""

    # ── Application ────────────────────────────────────────────────────────────
    APP_NAME: str = "E-Rakshak AI"
    APP_ENV: str = "development"
    API_VERSION: str = "0.1.0"

    # ── Database (Supabase Managed PostgreSQL) ──────────────────────────────────
    # Full SQLAlchemy-compatible connection string.
    # Must use postgresql+asyncpg:// driver.
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/erakshak_db"
    
    # ── Supabase Credentials ───────────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""

    # ── CORS ───────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins for the CORS middleware.
    # In development this typically points at the Next.js dev server.
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Location & Routing (Phase 8) ───────────────────────────────────────────
    ROUTING_PROVIDER: str = "osrm"
    OSRM_BASE_URL: str = "https://router.project-osrm.org"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton of the application settings.

    Using ``@lru_cache`` ensures that the .env file is only parsed once per
    process lifetime, keeping startup fast and preventing inconsistencies.
    """
    return Settings()


# Convenience alias used throughout the application.
settings: Settings = get_settings()
