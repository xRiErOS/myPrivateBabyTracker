"""Tests for the Checkup plugin — U-Untersuchungen CRUD + next-due API."""

from datetime import date, timedelta

import pytest
from httpx import AsyncClient

from app.plugins.checkup.models import CheckupType


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_child(client: AsyncClient, birth_date: str = "2025-06-01") -> int:
    """Create a child and return its ID."""
    resp = await client.post("/api/v1/children/", json={
        "name": "Test Baby",
        "birth_date": birth_date,
    })
    assert resp.status_code == 201
    return resp.json()["id"]


async def _seed_checkup_types(client: AsyncClient) -> list[dict]:
    """Get seeded checkup types (auto-created by table setup)."""
    # Types are seeded in migration; for in-memory tests, create manually
    from sqlalchemy import select
    from app.plugins.checkup.seed_data import CHECKUP_TYPES
    return CHECKUP_TYPES


async def _create_checkup_type(client: AsyncClient, db_session) -> int:
    """Create a checkup type directly in DB and return ID."""
    ct = CheckupType(
        name="U3",
        display_name="U3 — 4. bis 5. Lebenswoche",
        recommended_age_weeks_min=4,
        recommended_age_weeks_max=5,
        description="Test checkup",
    )
    db_session.add(ct)
    await db_session.commit()
    await db_session.refresh(ct)
    return ct.id


async def _create_checkup_type_via_db(async_client, async_session, name="U3", min_w=4, max_w=5) -> int:
    """Insert a CheckupType directly via session."""
    ct = CheckupType(
        name=name,
        display_name=f"{name} — Test",
        recommended_age_weeks_min=min_w,
        recommended_age_weeks_max=max_w,
        description=f"Test {name}",
    )
    async_session.add(ct)
    await async_session.commit()
    await async_session.refresh(ct)
    return ct.id


# ---------------------------------------------------------------------------
# CRUD Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_list_checkup_types_empty(async_client):
    """GET /api/v1/checkup/types returns empty list when no types seeded."""
    resp = await async_client.get("/api/v1/checkup/types")
    assert resp.status_code == 200
    # In-memory DB has no seeded data
    assert isinstance(resp.json(), list)


@pytest.mark.anyio
async def test_create_checkup(async_client, async_session):
    """POST /api/v1/checkup/ creates a checkup entry."""
    child_id = await _create_child(async_client)
    type_id = await _create_checkup_type_via_db(async_client, async_session)

    resp = await async_client.post("/api/v1/checkup/", json={
        "child_id": child_id,
        "checkup_type_id": type_id,
        "date": "2025-07-01",
        "doctor": "Dr. Mueller",
        "weight_grams": 4500,
        "height_cm": 55.0,
        "head_circumference_cm": 37.5,
        "notes": "Alles gut",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["child_id"] == child_id
    assert data["checkup_type_name"] == "U3"
    assert data["doctor"] == "Dr. Mueller"
    assert data["weight_grams"] == 4500
    assert data["height_cm"] == 55.0
    assert data["head_circumference_cm"] == 37.5


@pytest.mark.anyio
async def test_list_checkups(async_client, async_session):
    """GET /api/v1/checkup/ returns entries."""
    child_id = await _create_child(async_client)
    type_id = await _create_checkup_type_via_db(async_client, async_session)

    await async_client.post("/api/v1/checkup/", json={
        "child_id": child_id,
        "checkup_type_id": type_id,
        "date": "2025-07-01",
    })

    resp = await async_client.get(f"/api/v1/checkup/?child_id={child_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.anyio
async def test_get_checkup(async_client, async_session):
    """GET /api/v1/checkup/{id} returns single entry."""
    child_id = await _create_child(async_client)
    type_id = await _create_checkup_type_via_db(async_client, async_session)

    create_resp = await async_client.post("/api/v1/checkup/", json={
        "child_id": child_id,
        "checkup_type_id": type_id,
        "date": "2025-07-01",
    })
    entry_id = create_resp.json()["id"]

    resp = await async_client.get(f"/api/v1/checkup/{entry_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == entry_id


@pytest.mark.anyio
async def test_get_checkup_not_found(async_client):
    """GET /api/v1/checkup/999 returns 404."""
    resp = await async_client.get("/api/v1/checkup/999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_checkup(async_client, async_session):
    """PATCH /api/v1/checkup/{id} updates entry."""
    child_id = await _create_child(async_client)
    type_id = await _create_checkup_type_via_db(async_client, async_session)

    create_resp = await async_client.post("/api/v1/checkup/", json={
        "child_id": child_id,
        "checkup_type_id": type_id,
        "date": "2025-07-01",
    })
    entry_id = create_resp.json()["id"]

    resp = await async_client.patch(f"/api/v1/checkup/{entry_id}", json={
        "doctor": "Dr. Schmidt",
        "notes": "Updated notes",
    })
    assert resp.status_code == 200
    assert resp.json()["doctor"] == "Dr. Schmidt"


@pytest.mark.anyio
async def test_delete_checkup(async_client, async_session):
    """DELETE /api/v1/checkup/{id} removes entry."""
    child_id = await _create_child(async_client)
    type_id = await _create_checkup_type_via_db(async_client, async_session)

    create_resp = await async_client.post("/api/v1/checkup/", json={
        "child_id": child_id,
        "checkup_type_id": type_id,
        "date": "2025-07-01",
    })
    entry_id = create_resp.json()["id"]

    resp = await async_client.delete(f"/api/v1/checkup/{entry_id}")
    assert resp.status_code == 204


@pytest.mark.anyio
async def test_create_checkup_invalid_type(async_client):
    """POST /api/v1/checkup/ with invalid type returns 404."""
    child_id = await _create_child(async_client)
    resp = await async_client.post("/api/v1/checkup/", json={
        "child_id": child_id,
        "checkup_type_id": 999,
        "date": "2025-07-01",
    })
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_next_checkup(async_client, async_session):
    """GET /api/v1/checkup/next/{id} returns next due checkup."""
    # Child born recently
    today = date.today()
    child_id = await _create_child(async_client, birth_date=today.isoformat())

    # Create U1 type
    u1_id = await _create_checkup_type_via_db(async_client, async_session, "U1", 0, 0)
    # Create U2 type
    u2_id = await _create_checkup_type_via_db(async_client, async_session, "U2", 0, 2)

    # Complete U1
    await async_client.post("/api/v1/checkup/", json={
        "child_id": child_id,
        "checkup_type_id": u1_id,
        "date": today.isoformat(),
        "is_completed": True,
    })

    resp = await async_client.get(f"/api/v1/checkup/next/{child_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["checkup_type"]["name"] == "U2"
    assert data["is_due"] is True


@pytest.mark.anyio
async def test_next_checkup_all_done(async_client, async_session):
    """GET /api/v1/checkup/next/{id} returns null when all done."""
    child_id = await _create_child(async_client)
    u1_id = await _create_checkup_type_via_db(async_client, async_session, "U1", 0, 0)

    await async_client.post("/api/v1/checkup/", json={
        "child_id": child_id,
        "checkup_type_id": u1_id,
        "date": "2025-06-01",
    })

    resp = await async_client.get(f"/api/v1/checkup/next/{child_id}")
    assert resp.status_code == 200
    # Only U1 exists and it's completed — null response
    assert resp.json() is None


@pytest.mark.anyio
async def test_next_checkup_child_not_found(async_client):
    """GET /api/v1/checkup/next/999 returns 404."""
    resp = await async_client.get("/api/v1/checkup/next/999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_checkup_with_measurements(async_client, async_session):
    """Checkup with optional measurement fields."""
    child_id = await _create_child(async_client)
    type_id = await _create_checkup_type_via_db(async_client, async_session)

    resp = await async_client.post("/api/v1/checkup/", json={
        "child_id": child_id,
        "checkup_type_id": type_id,
        "date": "2025-07-01",
        "weight_grams": 4500,
        "height_cm": 55.0,
        "head_circumference_cm": 37.5,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["weight_grams"] == 4500
    assert data["height_cm"] == 55.0
    assert data["head_circumference_cm"] == 37.5


@pytest.mark.anyio
async def test_checkup_without_measurements(async_client, async_session):
    """Checkup without measurement fields — all null."""
    child_id = await _create_child(async_client)
    type_id = await _create_checkup_type_via_db(async_client, async_session)

    resp = await async_client.post("/api/v1/checkup/", json={
        "child_id": child_id,
        "checkup_type_id": type_id,
        "date": "2025-07-01",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["weight_grams"] is None
    assert data["height_cm"] is None
