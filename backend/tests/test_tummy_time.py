"""Tests for the TummyTime plugin -- CRUD, filters, validation, duration, discovery."""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_child(async_client: AsyncClient, name: str = "TestBaby") -> int:
    """Create a child and return its ID."""
    resp = await async_client.post(
        "/api/v1/children/",
        json={"name": name, "birth_date": "2025-01-01"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_tummy_time(
    async_client: AsyncClient,
    child_id: int,
    start: str = "2026-04-19T10:00:00Z",
    end: str | None = "2026-04-19T10:15:00Z",
    **kwargs,
) -> dict:
    """Create a tummy time entry and return the response JSON."""
    payload = {
        "child_id": child_id,
        "start_time": start,
        **kwargs,
    }
    if end is not None:
        payload["end_time"] = end
    resp = await async_client.post("/api/v1/tummy-time/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# CRUD Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_tummy_time_entry(async_client):
    """POST /api/v1/tummy-time/ creates an entry and returns 201."""
    child_id = await _create_child(async_client)
    data = await _create_tummy_time(async_client, child_id)

    assert data["id"] is not None
    assert data["child_id"] == child_id


@pytest.mark.anyio
async def test_list_tummy_time_entries(async_client):
    """GET /api/v1/tummy-time/ returns all entries."""
    child_id = await _create_child(async_client)
    await _create_tummy_time(async_client, child_id)
    await _create_tummy_time(
        async_client, child_id,
        start="2026-04-19T14:00:00Z", end="2026-04-19T14:20:00Z",
    )

    resp = await async_client.get("/api/v1/tummy-time/")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 2


@pytest.mark.anyio
async def test_get_tummy_time_entry(async_client):
    """GET /api/v1/tummy-time/{id} returns a single entry."""
    child_id = await _create_child(async_client)
    created = await _create_tummy_time(async_client, child_id)

    resp = await async_client.get(f"/api/v1/tummy-time/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


@pytest.mark.anyio
async def test_get_tummy_time_entry_not_found(async_client):
    """GET /api/v1/tummy-time/{id} returns 404 for non-existent entry."""
    resp = await async_client.get("/api/v1/tummy-time/9999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_tummy_time_entry(async_client):
    """PATCH /api/v1/tummy-time/{id} updates fields."""
    child_id = await _create_child(async_client)
    created = await _create_tummy_time(async_client, child_id)

    resp = await async_client.patch(
        f"/api/v1/tummy-time/{created['id']}",
        json={"notes": "Hat gut mitgemacht"},
    )
    assert resp.status_code == 200
    assert resp.json()["notes"] == "Hat gut mitgemacht"


@pytest.mark.anyio
async def test_update_tummy_time_entry_not_found(async_client):
    """PATCH /api/v1/tummy-time/{id} returns 404 for non-existent entry."""
    resp = await async_client.patch("/api/v1/tummy-time/9999", json={"notes": "test"})
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_tummy_time_entry(async_client):
    """DELETE /api/v1/tummy-time/{id} removes the entry."""
    child_id = await _create_child(async_client)
    created = await _create_tummy_time(async_client, child_id)

    resp = await async_client.delete(f"/api/v1/tummy-time/{created['id']}")
    assert resp.status_code == 204

    # Verify it's gone
    resp = await async_client.get(f"/api/v1/tummy-time/{created['id']}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_tummy_time_entry_not_found(async_client):
    """DELETE /api/v1/tummy-time/{id} returns 404 for non-existent entry."""
    resp = await async_client.delete("/api/v1/tummy-time/9999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Filter Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_filter_by_child_id(async_client):
    """GET /api/v1/tummy-time/?child_id= filters correctly."""
    child1 = await _create_child(async_client, "Baby1")
    child2 = await _create_child(async_client, "Baby2")
    await _create_tummy_time(async_client, child1)
    await _create_tummy_time(async_client, child2)

    resp = await async_client.get(f"/api/v1/tummy-time/?child_id={child1}")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["child_id"] == child1


@pytest.mark.anyio
async def test_filter_by_date_range(async_client):
    """GET /api/v1/tummy-time/?date_from=&date_to= filters correctly."""
    child_id = await _create_child(async_client)
    await _create_tummy_time(
        async_client, child_id,
        start="2026-04-18T10:00:00Z", end="2026-04-18T10:15:00Z",
    )
    await _create_tummy_time(
        async_client, child_id,
        start="2026-04-19T10:00:00Z", end="2026-04-19T10:15:00Z",
    )

    resp = await async_client.get(
        "/api/v1/tummy-time/?date_from=2026-04-19T00:00:00Z&date_to=2026-04-19T23:59:59Z"
    )
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1


# ---------------------------------------------------------------------------
# Validation Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_notes_max_length(async_client):
    """Notes must not exceed 2000 characters."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/tummy-time/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-19T10:00:00Z",
            "notes": "x" * 2001,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_end_time_before_start_time(async_client):
    """end_time must be after start_time."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/tummy-time/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-19T11:00:00Z",
            "end_time": "2026-04-19T10:00:00Z",
        },
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Duration Calculation Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_duration_calculated(async_client):
    """Duration is computed from start and end times."""
    child_id = await _create_child(async_client)
    data = await _create_tummy_time(
        async_client,
        child_id,
        start="2026-04-19T10:00:00Z",
        end="2026-04-19T10:15:00Z",
    )
    assert data["duration_minutes"] == 15


@pytest.mark.anyio
async def test_duration_null_when_ongoing(async_client):
    """Duration is null when end_time is not set (ongoing session)."""
    child_id = await _create_child(async_client)
    data = await _create_tummy_time(
        async_client,
        child_id,
        start="2026-04-19T10:00:00Z",
        end=None,
    )
    assert data["duration_minutes"] is None
    assert data["end_time"] is None


@pytest.mark.anyio
async def test_duration_recalculated_on_update(async_client):
    """Duration is recomputed when end_time is updated."""
    child_id = await _create_child(async_client)
    created = await _create_tummy_time(async_client, child_id, end=None)
    assert created["duration_minutes"] is None

    resp = await async_client.patch(
        f"/api/v1/tummy-time/{created['id']}",
        json={"end_time": "2026-04-19T10:20:00Z"},
    )
    assert resp.status_code == 200
    assert resp.json()["duration_minutes"] == 20


# ---------------------------------------------------------------------------
# Plugin Discovery Test
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_tummy_time_plugin_discovered():
    """TummyTimePlugin is discovered by the registry."""
    from app.plugins.registry import PluginRegistry

    registry = PluginRegistry()
    discovered = registry.discover()
    names = [p.name for p in discovered]
    assert "tummytime" in names


@pytest.mark.anyio
async def test_tummy_time_plugin_widgets():
    """TummyTimePlugin exposes a tummy_time_summary widget."""
    from app.plugins.tummytime import TummyTimePlugin

    plugin = TummyTimePlugin()
    widgets = plugin.register_widgets()
    assert len(widgets) == 1
    assert widgets[0].name == "tummy_time_summary"
    assert widgets[0].size == "medium"
