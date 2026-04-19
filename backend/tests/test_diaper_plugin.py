"""Tests for the Diaper plugin -- CRUD, filters, validation."""

import os

os.environ.setdefault("SECRET_KEY", "a" * 32)
os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("AUTH_MODE", "disabled")
os.environ.setdefault("ENVIRONMENT", "dev")

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_session
from app.main import create_app
from app.models.base import Base
from app.models.child import Child


@pytest.fixture
def app():
    """Create a test application instance with diaper routes."""
    from app.plugins.diaper.router import router as diaper_router

    application = create_app(testing=True)
    application.include_router(diaper_router)
    return application


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
    """Async test client with in-memory DB override."""
    factory = async_sessionmaker(async_engine, expire_on_commit=False)

    async def _override_session():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_session] = _override_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def child(async_session: AsyncSession) -> Child:
    """Create a test child."""
    from datetime import date

    child = Child(name="Test Baby", birth_date=date(2025, 1, 15))
    async_session.add(child)
    await async_session.commit()
    await async_session.refresh(child)
    return child


# --- CRUD Tests ---


@pytest.mark.anyio
async def test_create_diaper_entry(async_client: AsyncClient, child: Child):
    """POST /api/v1/diaper/ creates a new entry."""
    payload = {
        "child_id": child.id,
        "time": "2026-04-19T10:00:00Z",
        "diaper_type": "wet",
        "notes": "Normal",
    }
    resp = await async_client.post("/api/v1/diaper/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["child_id"] == child.id
    assert data["diaper_type"] == "wet"
    assert data["has_rash"] is False
    assert data["notes"] == "Normal"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.anyio
async def test_create_diaper_entry_full(async_client: AsyncClient, child: Child):
    """POST with all fields including color, consistency, has_rash."""
    payload = {
        "child_id": child.id,
        "time": "2026-04-19T08:00:00Z",
        "diaper_type": "dirty",
        "color": "yellow",
        "consistency": "soft",
        "has_rash": True,
        "notes": "Leichter Ausschlag",
    }
    resp = await async_client.post("/api/v1/diaper/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["diaper_type"] == "dirty"
    assert data["color"] == "yellow"
    assert data["consistency"] == "soft"
    assert data["has_rash"] is True


@pytest.mark.anyio
async def test_list_diaper_entries(async_client: AsyncClient, child: Child):
    """GET /api/v1/diaper/ returns list of entries."""
    # Create two entries
    for dt in ["wet", "dirty"]:
        await async_client.post(
            "/api/v1/diaper/",
            json={
                "child_id": child.id,
                "time": "2026-04-19T10:00:00Z",
                "diaper_type": dt,
            },
        )
    resp = await async_client.get("/api/v1/diaper/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


@pytest.mark.anyio
async def test_get_diaper_entry(async_client: AsyncClient, child: Child):
    """GET /api/v1/diaper/{id} returns single entry."""
    create_resp = await async_client.post(
        "/api/v1/diaper/",
        json={
            "child_id": child.id,
            "time": "2026-04-19T10:00:00Z",
            "diaper_type": "mixed",
        },
    )
    entry_id = create_resp.json()["id"]

    resp = await async_client.get(f"/api/v1/diaper/{entry_id}")
    assert resp.status_code == 200
    assert resp.json()["diaper_type"] == "mixed"


@pytest.mark.anyio
async def test_get_nonexistent_entry(async_client: AsyncClient):
    """GET /api/v1/diaper/999 returns 404."""
    resp = await async_client.get("/api/v1/diaper/999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_diaper_entry(async_client: AsyncClient, child: Child):
    """PATCH /api/v1/diaper/{id} updates fields."""
    create_resp = await async_client.post(
        "/api/v1/diaper/",
        json={
            "child_id": child.id,
            "time": "2026-04-19T10:00:00Z",
            "diaper_type": "wet",
        },
    )
    entry_id = create_resp.json()["id"]

    resp = await async_client.patch(
        f"/api/v1/diaper/{entry_id}",
        json={"diaper_type": "dirty", "has_rash": True, "color": "brown"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["diaper_type"] == "dirty"
    assert data["has_rash"] is True
    assert data["color"] == "brown"


@pytest.mark.anyio
async def test_update_nonexistent_entry(async_client: AsyncClient):
    """PATCH /api/v1/diaper/999 returns 404."""
    resp = await async_client.patch(
        "/api/v1/diaper/999", json={"diaper_type": "wet"}
    )
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_diaper_entry(async_client: AsyncClient, child: Child):
    """DELETE /api/v1/diaper/{id} removes entry."""
    create_resp = await async_client.post(
        "/api/v1/diaper/",
        json={
            "child_id": child.id,
            "time": "2026-04-19T10:00:00Z",
            "diaper_type": "dry",
        },
    )
    entry_id = create_resp.json()["id"]

    resp = await async_client.delete(f"/api/v1/diaper/{entry_id}")
    assert resp.status_code == 204

    # Verify gone
    resp = await async_client.get(f"/api/v1/diaper/{entry_id}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_nonexistent_entry(async_client: AsyncClient):
    """DELETE /api/v1/diaper/999 returns 404."""
    resp = await async_client.delete("/api/v1/diaper/999")
    assert resp.status_code == 404


# --- Filter Tests ---


@pytest.mark.anyio
async def test_filter_by_child_id(async_client: AsyncClient, async_session: AsyncSession):
    """GET with child_id filter returns only that child's entries."""
    from datetime import date

    child1 = Child(name="Baby A", birth_date=date(2025, 1, 1))
    child2 = Child(name="Baby B", birth_date=date(2025, 6, 1))
    async_session.add_all([child1, child2])
    await async_session.commit()
    await async_session.refresh(child1)
    await async_session.refresh(child2)

    await async_client.post(
        "/api/v1/diaper/",
        json={"child_id": child1.id, "time": "2026-04-19T10:00:00Z", "diaper_type": "wet"},
    )
    await async_client.post(
        "/api/v1/diaper/",
        json={"child_id": child2.id, "time": "2026-04-19T10:00:00Z", "diaper_type": "dirty"},
    )

    resp = await async_client.get(f"/api/v1/diaper/?child_id={child1.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["child_id"] == child1.id


@pytest.mark.anyio
async def test_filter_by_diaper_type(async_client: AsyncClient, child: Child):
    """GET with diaper_type filter returns only matching entries."""
    await async_client.post(
        "/api/v1/diaper/",
        json={"child_id": child.id, "time": "2026-04-19T08:00:00Z", "diaper_type": "wet"},
    )
    await async_client.post(
        "/api/v1/diaper/",
        json={"child_id": child.id, "time": "2026-04-19T09:00:00Z", "diaper_type": "dirty"},
    )
    await async_client.post(
        "/api/v1/diaper/",
        json={"child_id": child.id, "time": "2026-04-19T10:00:00Z", "diaper_type": "wet"},
    )

    resp = await async_client.get("/api/v1/diaper/?diaper_type=wet")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert all(e["diaper_type"] == "wet" for e in data)


# --- Validation Tests ---


@pytest.mark.anyio
async def test_invalid_diaper_type(async_client: AsyncClient, child: Child):
    """POST with invalid diaper_type returns 422."""
    resp = await async_client.post(
        "/api/v1/diaper/",
        json={
            "child_id": child.id,
            "time": "2026-04-19T10:00:00Z",
            "diaper_type": "invalid",
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_notes_max_length(async_client: AsyncClient, child: Child):
    """POST with notes exceeding max_length returns 422."""
    resp = await async_client.post(
        "/api/v1/diaper/",
        json={
            "child_id": child.id,
            "time": "2026-04-19T10:00:00Z",
            "diaper_type": "wet",
            "notes": "x" * 2001,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_color_max_length(async_client: AsyncClient, child: Child):
    """POST with color exceeding max_length returns 422."""
    resp = await async_client.post(
        "/api/v1/diaper/",
        json={
            "child_id": child.id,
            "time": "2026-04-19T10:00:00Z",
            "diaper_type": "wet",
            "color": "x" * 31,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_consistency_max_length(async_client: AsyncClient, child: Child):
    """POST with consistency exceeding max_length returns 422."""
    resp = await async_client.post(
        "/api/v1/diaper/",
        json={
            "child_id": child.id,
            "time": "2026-04-19T10:00:00Z",
            "diaper_type": "wet",
            "consistency": "x" * 31,
        },
    )
    assert resp.status_code == 422


# --- Boolean has_rash Tests ---


@pytest.mark.anyio
async def test_has_rash_default_false(async_client: AsyncClient, child: Child):
    """has_rash defaults to False when not provided."""
    resp = await async_client.post(
        "/api/v1/diaper/",
        json={
            "child_id": child.id,
            "time": "2026-04-19T10:00:00Z",
            "diaper_type": "wet",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["has_rash"] is False


@pytest.mark.anyio
async def test_has_rash_true(async_client: AsyncClient, child: Child):
    """has_rash can be set to True."""
    resp = await async_client.post(
        "/api/v1/diaper/",
        json={
            "child_id": child.id,
            "time": "2026-04-19T10:00:00Z",
            "diaper_type": "wet",
            "has_rash": True,
        },
    )
    assert resp.status_code == 201
    assert resp.json()["has_rash"] is True


@pytest.mark.anyio
async def test_update_has_rash(async_client: AsyncClient, child: Child):
    """PATCH can toggle has_rash."""
    create_resp = await async_client.post(
        "/api/v1/diaper/",
        json={
            "child_id": child.id,
            "time": "2026-04-19T10:00:00Z",
            "diaper_type": "wet",
            "has_rash": False,
        },
    )
    entry_id = create_resp.json()["id"]

    resp = await async_client.patch(
        f"/api/v1/diaper/{entry_id}", json={"has_rash": True}
    )
    assert resp.status_code == 200
    assert resp.json()["has_rash"] is True


# --- Plugin Registration Test ---


def test_diaper_plugin_class():
    """DiaperPlugin has correct metadata and methods."""
    from app.plugins.diaper import DiaperPlugin
    from app.plugins.diaper.models import DiaperEntry

    plugin = DiaperPlugin()
    assert plugin.name == "diaper"
    assert plugin.display_name == "Windeln"
    assert DiaperEntry in plugin.register_models()

    widgets = plugin.register_widgets()
    assert len(widgets) == 1
    assert widgets[0].name == "diaper_summary"
    assert widgets[0].size == "small"
