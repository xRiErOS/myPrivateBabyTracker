"""Application configuration via pydantic-settings.

All values can be overridden via environment variables.
SECRET_KEY is required and must be at least 32 characters (Security K4).
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """MyBaby application settings. Validates on startup — crashes if misconfigured."""

    # Security (K4): App refuses to start without valid SECRET_KEY
    secret_key: str = Field(..., min_length=32)

    # Database
    database_url: str = Field(default="sqlite:///data/mybaby.db")

    # Auth
    auth_mode: Literal["forward", "local", "both", "disabled"] = "forward"
    auth_trusted_header: str = "Remote-User"
    auth_trusted_proxies: str = "192.168.178.0/24"

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # CORS
    cors_origins: list[str] = Field(default_factory=list)

    # CSRF (K2): Double-Submit-Cookie secret
    csrf_secret: str = Field(default="")

    # Rate Limiting (E1)
    rate_limit: str = Field(default="60/minute")

    # Request Size Limit (K3) — max body size in bytes (default 1MB)
    request_size_limit: int = Field(default=1_048_576, ge=1024)

    # CSRF enabled (disabled in testing)
    csrf_enabled: bool = True

    # Environment
    environment: Literal["dev", "staging", "prod"] = "dev"

    # Live-Preview im PO-Dashboard: erlaubte Embed-Origin (z.B. http://localhost:5555).
    # Wenn gesetzt, wird X-Frame-Options weggelassen und CSP frame-ancestors gesetzt.
    dashboard_preview_origin: str = Field(default="")

    model_config = {
        "env_prefix": "",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()  # type: ignore[call-arg]
