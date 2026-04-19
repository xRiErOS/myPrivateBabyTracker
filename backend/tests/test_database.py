"""Tests for async database initialization and WAL mode."""

import tempfile
from pathlib import Path

import pytest
from sqlalchemy import text

from app.database import get_engine, get_session, init_db, dispose_engine
from app.models.base import Base


class TestDatabase:
    """Database configuration tests."""

    @pytest.fixture(autouse=True)
    async def _setup_teardown(self, tmp_path):
        """Initialize and cleanup DB for each test using a temp file."""
        self.db_path = tmp_path / "test.db"
        self.db_url = f"sqlite:///{self.db_path}"
        init_db(self.db_url)
        yield
        await dispose_engine()

    def test_engine_created(self):
        """init_db should create an engine."""
        engine = get_engine()
        assert engine is not None
        assert "sqlite" in str(engine.url)

    async def test_wal_mode_enabled(self):
        """SQLite WAL mode should be active after init."""
        engine = get_engine()
        async with engine.connect() as conn:
            result = await conn.execute(text("PRAGMA journal_mode"))
            mode = result.scalar()
            assert mode == "wal"

    async def test_foreign_keys_enabled(self):
        """SQLite foreign keys should be ON."""
        engine = get_engine()
        async with engine.connect() as conn:
            result = await conn.execute(text("PRAGMA foreign_keys"))
            fk = result.scalar()
            assert fk == 1

    async def test_get_session_yields_async_session(self):
        """get_session should yield an AsyncSession."""
        from sqlalchemy.ext.asyncio import AsyncSession

        async for session in get_session():
            assert isinstance(session, AsyncSession)

    async def test_get_session_raises_without_init(self):
        """get_session should raise RuntimeError if DB not initialized."""
        await dispose_engine()  # teardown first
        with pytest.raises(RuntimeError, match="not initialized"):
            async for _ in get_session():
                pass

    def test_base_class_exists(self):
        """DeclarativeBase should be importable for models."""
        assert Base is not None
        assert hasattr(Base, "metadata")

    async def test_dispose_engine_cleanup(self):
        """dispose_engine should clean up engine and session factory."""
        await dispose_engine()
        assert get_engine() is None
