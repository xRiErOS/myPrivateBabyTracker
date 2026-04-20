"""Tests for the Temperature plugin — CRUD, filters, validation, discovery."""

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


async def _create_temperature(
    async_client: AsyncClient,
    child_id: int,
    measured_at: str = "2026-04-20T08:00:00Z",
    temperature_celsius: float = 36.8,
    **kwargs,
) -> dict:
    """Create a temperature entry and return the response JSON."""
    payload = {
        "child_id": child_id,
        "measured_at": measured_at,
        "temperature_celsius": temperature_celsius,
        **kwargs,
    }
    resp = await async_client.post("/api/v1/temperature/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# CRUD Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_temperature_entry(async_client):
    """POST /api/v1/temperature/ creates an entry and returns 201."""
    child_id = await _create_child(async_client)
    data = await _create_temperature(async_client, child_id)

    assert data["id"] is not None
    assert data["child_id"] == child_id
    assert data["temperature_celsius"] == 36.8


@pytest.mark.anyio
async def test_create_temperature_with_notes(async_client):
    """POST /api/v1/temperature/ accepts optional notes."""
    child_id = await _create_child(async_client)
    data = await _create_temperature(
        async_client, child_id, notes="Nach dem Stillen gemessen"
    )

    assert data["notes"] == "Nach dem Stillen gemessen"


@pytest.mark.anyio
async def test_list_temperature_entries(async_client):
    """GET /api/v1/temperature/ returns all entries."""
    child_id = await _create_child(async_client)
    await _create_temperature(async_client, child_id)
    await _create_temperature(
        async_client, child_id,
        measured_at="2026-04-20T18:00:00Z",
        temperature_celsius=37.2,
    )

    resp = await async_client.get("/api/v1/temperature/")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 2


@pytest.mark.anyio
async def test_get_temperature_entry(async_client):
    """GET /api/v1/temperature/{id} returns a single entry."""
    child_id = await _create_child(async_client)
    created = await _create_temperature(async_client, child_id)

    resp = await async_client.get(f"/api/v1/temperature/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]
    assert resp.json()["temperature_celsius"] == 36.8


@pytest.mark.anyio
async def test_get_temperature_entry_not_found(async_client):
    """GET /api/v1/temperature/{id} returns 404 for non-existent entry."""
    resp = await async_client.get("/api/v1/temperature/9999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_temperature_entry(async_client):
    """PATCH /api/v1/temperature/{id} updates fields."""
    child_id = await _create_child(async_client)
    created = await _create_temperature(async_client, child_id)

    resp = await async_client.patch(
        f"/api/v1/temperature/{created['id']}",
        json={"temperature_celsius": 37.5, "notes": "Fieber?"},
    )
    assert resp.status_code == 200
    assert resp.json()["temperature_celsius"] == 37.5
    assert resp.json()["notes"] == "Fieber?"


@pytest.mark.anyio
async def test_update_temperature_entry_not_found(async_client):
    """PATCH /api/v1/temperature/{id} returns 404 for non-existent entry."""
    resp = await async_client.patch(
        "/api/v1/temperature/9999", json={"temperature_celsius": 37.0}
    )
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_temperature_entry(async_client):
    """DELETE /api/v1/temperature/{id} removes the entry."""
    child_id = await _create_child(async_client)
    created = await _create_temperature(async_client, child_id)

    resp = await async_client.delete(f"/api/v1/temperature/{created['id']}")
    assert resp.status_code == 204

    # Verify it's gone
    resp = await async_client.get(f"/api/v1/temperature/{created['id']}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_temperature_entry_not_found(async_client):
    """DELETE /api/v1/temperature/{id} returns 404 for non-existent entry."""
    resp = await async_client.delete("/api/v1/temperature/9999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Filter Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_filter_by_child_id(async_client):
    """GET /api/v1/temperature/?child_id= filters correctly."""
    child1 = await _create_child(async_client, "Baby1")
    child2 = await _create_child(async_client, "Baby2")
    await _create_temperature(async_client, child1)
    await _create_temperature(async_client, child2)

    resp = await async_client.get(f"/api/v1/temperature/?child_id={child1}")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["child_id"] == child1


@pytest.mark.anyio
async def test_filter_by_date_range(async_client):
    """GET /api/v1/temperature/?date_from=&date_to= filters correctly."""
    child_id = await _create_child(async_client)
    await _create_temperature(
        async_client, child_id, measured_at="2026-04-18T08:00:00Z"
    )
    await _create_temperature(
        async_client, child_id, measured_at="2026-04-20T08:00:00Z"
    )

    resp = await async_client.get(
        "/api/v1/temperature/?date_from=2026-04-20T00:00:00Z&date_to=2026-04-20T23:59:59Z"
    )
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1


# ---------------------------------------------------------------------------
# Validation Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_temperature_too_low(async_client):
    """Temperature below 34.0 must be rejected."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/temperature/",
        json={
            "child_id": child_id,
            "measured_at": "2026-04-20T08:00:00Z",
            "temperature_celsius": 33.9,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_temperature_too_high(async_client):
    """Temperature above 43.0 must be rejected."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/temperature/",
        json={
            "child_id": child_id,
            "measured_at": "2026-04-20T08:00:00Z",
            "temperature_celsius": 43.1,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_temperature_boundary_low(async_client):
    """Temperature at exactly 34.0 should be accepted."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/temperature/",
        json={
            "child_id": child_id,
            "measured_at": "2026-04-20T08:00:00Z",
            "temperature_celsius": 34.0,
        },
    )
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_temperature_boundary_high(async_client):
    """Temperature at exactly 43.0 should be accepted."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/temperature/",
        json={
            "child_id": child_id,
            "measured_at": "2026-04-20T08:00:00Z",
            "temperature_celsius": 43.0,
        },
    )
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_notes_max_length(async_client):
    """Notes must not exceed 2000 characters."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/temperature/",
        json={
            "child_id": child_id,
            "measured_at": "2026-04-20T08:00:00Z",
            "temperature_celsius": 36.5,
            "notes": "x" * 2001,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_missing_required_fields(async_client):
    """Missing child_id or temperature_celsius must be rejected."""
    resp = await async_client.post(
        "/api/v1/temperature/",
        json={"measured_at": "2026-04-20T08:00:00Z"},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# UTC Serialization Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_utc_serialization(async_client):
    """Timestamps are serialized with Z suffix (UTC)."""
    child_id = await _create_child(async_client)
    data = await _create_temperature(async_client, child_id)

    assert data["measured_at"].endswith("Z")
    assert data["created_at"].endswith("Z")


# ---------------------------------------------------------------------------
# Plugin Discovery Test
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_temperature_plugin_discovered():
    """TemperaturePlugin is discovered by the registry."""
    from app.plugins.registry import PluginRegistry

    registry = PluginRegistry()
    discovered = registry.discover()
    names = [p.name for p in discovered]
    assert "temperature" in names


@pytest.mark.anyio
async def test_temperature_plugin_widgets():
    """TemperaturePlugin exposes a temperature_latest widget."""
    from app.plugins.temperature import TemperaturePlugin

    plugin = TemperaturePlugin()
    widgets = plugin.register_widgets()
    assert len(widgets) == 1
    assert widgets[0].name == "temperature_latest"
    assert widgets[0].size == "small"
