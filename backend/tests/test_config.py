"""Tests for application configuration (Security K4)."""

import os

import pytest
from pydantic import ValidationError


class TestSettings:
    """Config validation tests."""

    def test_rejects_missing_secret_key(self):
        """App must refuse to start without SECRET_KEY."""
        from app.config import Settings

        with pytest.raises(ValidationError, match="secret_key"):
            Settings(secret_key="")

    def test_rejects_short_secret_key(self):
        """SECRET_KEY must be at least 32 characters (K4)."""
        from app.config import Settings

        with pytest.raises(ValidationError, match="at least 32"):
            Settings(secret_key="tooshort")

    def test_accepts_valid_settings(self):
        """Valid configuration loads without error."""
        from app.config import Settings

        s = Settings(
            secret_key="a" * 32,
            database_url="sqlite:///test.db",
            auth_mode="forward",
        )
        assert s.auth_mode == "forward"
        assert s.log_level == "INFO"
        assert s.environment == "dev"
        assert s.rate_limit == "60/minute"
        assert s.cors_origins == []
        assert s.csrf_secret == ""

    def test_auth_mode_validates(self):
        """Only forward, local, both are valid auth modes."""
        from app.config import Settings

        with pytest.raises(ValidationError, match="auth_mode"):
            Settings(secret_key="a" * 32, auth_mode="invalid")

    def test_log_level_validates(self):
        """Only DEBUG, INFO, WARNING, ERROR are valid log levels."""
        from app.config import Settings

        with pytest.raises(ValidationError, match="log_level"):
            Settings(secret_key="a" * 32, log_level="TRACE")

    def test_environment_validates(self):
        """Only dev, staging, prod are valid environments."""
        from app.config import Settings

        with pytest.raises(ValidationError, match="environment"):
            Settings(secret_key="a" * 32, environment="local")

    def test_cors_origins_accepts_list(self):
        """CORS origins should be a list of strings."""
        from app.config import Settings

        s = Settings(
            secret_key="a" * 32,
            cors_origins=["http://localhost:3000", "https://baby.example.com"],
        )
        assert len(s.cors_origins) == 2

    def test_default_database_url(self, monkeypatch):
        """Default database URL points to data/mybaby.db."""
        from app.config import Settings

        monkeypatch.delenv("DATABASE_URL", raising=False)
        s = Settings(secret_key="a" * 32)
        assert s.database_url == "sqlite:///data/mybaby.db"
