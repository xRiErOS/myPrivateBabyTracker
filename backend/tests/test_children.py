"""Test Children CRUD endpoints — full lifecycle + auth + validation (K3)."""

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_create_child(async_client: AsyncClient):
    """POST /api/v1/children/ creates a child and returns 201."""
    response = await async_client.post(
        "/api/v1/children/",
        json={"name": "Mia", "birth_date": "2025-06-15"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Mia"
    assert data["birth_date"] == "2025-06-15"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.anyio
async def test_create_child_with_notes(async_client: AsyncClient):
    """POST with optional notes field."""
    response = await async_client.post(
        "/api/v1/children/",
        json={"name": "Leo", "birth_date": "2025-03-01", "notes": "First child"},
    )
    assert response.status_code == 201
    assert response.json()["notes"] == "First child"


@pytest.mark.anyio
async def test_list_children(async_client: AsyncClient):
    """GET /api/v1/children/ returns list of active children."""
    # Create two children
    await async_client.post(
        "/api/v1/children/",
        json={"name": "Anna", "birth_date": "2025-01-01"},
    )
    await async_client.post(
        "/api/v1/children/",
        json={"name": "Ben", "birth_date": "2025-02-01"},
    )

    response = await async_client.get("/api/v1/children/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = [c["name"] for c in data]
    assert "Anna" in names
    assert "Ben" in names


@pytest.mark.anyio
async def test_get_child_by_id(async_client: AsyncClient):
    """GET /api/v1/children/{id} returns a single child."""
    create = await async_client.post(
        "/api/v1/children/",
        json={"name": "Clara", "birth_date": "2025-04-01"},
    )
    child_id = create.json()["id"]

    response = await async_client.get(f"/api/v1/children/{child_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Clara"


@pytest.mark.anyio
async def test_get_child_not_found(async_client: AsyncClient):
    """GET non-existent child returns 404."""
    response = await async_client.get("/api/v1/children/99999")
    assert response.status_code == 404


@pytest.mark.anyio
async def test_update_child(async_client: AsyncClient):
    """PATCH /api/v1/children/{id} updates fields."""
    create = await async_client.post(
        "/api/v1/children/",
        json={"name": "David", "birth_date": "2025-05-01"},
    )
    child_id = create.json()["id"]

    response = await async_client.patch(
        f"/api/v1/children/{child_id}",
        json={"name": "David Jr.", "notes": "Updated"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "David Jr."
    assert data["notes"] == "Updated"


@pytest.mark.anyio
async def test_update_child_not_found(async_client: AsyncClient):
    """PATCH non-existent child returns 404."""
    response = await async_client.patch(
        "/api/v1/children/99999",
        json={"name": "Ghost"},
    )
    assert response.status_code == 404


@pytest.mark.anyio
async def test_delete_child_soft_delete(async_client: AsyncClient):
    """DELETE /api/v1/children/{id} soft-deletes (sets is_active=False)."""
    create = await async_client.post(
        "/api/v1/children/",
        json={"name": "Eve", "birth_date": "2025-07-01"},
    )
    child_id = create.json()["id"]

    response = await async_client.delete(f"/api/v1/children/{child_id}")
    assert response.status_code == 204

    # Child should no longer appear in list (only active shown)
    list_response = await async_client.get("/api/v1/children/")
    ids = [c["id"] for c in list_response.json()]
    assert child_id not in ids


@pytest.mark.anyio
async def test_delete_child_not_found(async_client: AsyncClient):
    """DELETE non-existent child returns 404."""
    response = await async_client.delete("/api/v1/children/99999")
    assert response.status_code == 404


@pytest.mark.anyio
async def test_create_child_name_too_long_k3(async_client: AsyncClient):
    """K3: name exceeding 100 chars is rejected."""
    response = await async_client.post(
        "/api/v1/children/",
        json={"name": "x" * 101, "birth_date": "2025-01-01"},
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_create_child_notes_too_long_k3(async_client: AsyncClient):
    """K3: notes exceeding 2000 chars is rejected."""
    response = await async_client.post(
        "/api/v1/children/",
        json={"name": "Test", "birth_date": "2025-01-01", "notes": "x" * 2001},
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_create_child_empty_name_rejected(async_client: AsyncClient):
    """Empty name is rejected (min_length=1)."""
    response = await async_client.post(
        "/api/v1/children/",
        json={"name": "", "birth_date": "2025-01-01"},
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_auth_required_with_forward_auth():
    """When auth_mode is 'forward', endpoints require auth headers."""
    import os
    os.environ["AUTH_MODE"] = "forward"

    from app.config import get_settings
    get_settings.cache_clear()

    from app.main import create_app
    from app.database import get_session as _get_session
    from app.models.base import Base
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from httpx import ASGITransport, AsyncClient as AC

    app = create_app(testing=True)
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with factory() as s:
            yield s

    app.dependency_overrides[_get_session] = _override

    transport = ASGITransport(app=app)
    async with AC(transport=transport, base_url="http://test") as ac:
        # Children endpoint without auth header should fail
        response = await ac.get("/api/v1/children/")
        assert response.status_code == 401

        # Health should still work without auth
        health = await ac.get("/api/v1/health")
        assert health.status_code == 200

    await engine.dispose()
    # Reset to disabled for other tests
    os.environ["AUTH_MODE"] = "disabled"
    get_settings.cache_clear()
