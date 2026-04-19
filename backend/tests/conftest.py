"""Shared pytest fixtures for backend tests."""

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Set test environment before importing app
os.environ["SECRET_KEY"] = "a" * 32
os.environ["DATABASE_URL"] = "sqlite:///test.db"
os.environ["AUTH_MODE"] = "disabled"
os.environ["ENVIRONMENT"] = "dev"

from app.database import get_session  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models.base import Base  # noqa: E402


@pytest.fixture
def app():
    """Create a test application instance."""
    return create_app(testing=True)


@pytest.fixture
def client(app):
    """Synchronous test client for simple endpoint tests."""
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c


@pytest.fixture
async def async_engine():
    """Create an in-memory async SQLite engine for isolated tests."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def async_session(async_engine) -> AsyncSession:
    """Yield an async session bound to the in-memory engine."""
    factory = async_sessionmaker(async_engine, expire_on_commit=False)
    async with factory() as session:
        yield session


@pytest.fixture
async def async_client(app, async_engine):
    """Async test client with in-memory DB override.

    Manually discovers and registers plugin routes since httpx
    ASGITransport does not trigger the lifespan context.
    """
    from app.plugins import discover_plugins

    factory = async_sessionmaker(async_engine, expire_on_commit=False)

    async def _override_session():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_session] = _override_session

    # Register plugin routes (normally done in lifespan)
    plugins = discover_plugins()
    for plugin in plugins:
        plugin.register_routes(app)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
