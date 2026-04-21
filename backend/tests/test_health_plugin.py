"""Tests for the Health plugin — CRUD, filters, validation, discovery."""

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


async def _create_health(
    async_client: AsyncClient,
    child_id: int,
    entry_type: str = "spit_up",
    severity: str = "mild",
    time: str = "2026-04-19T10:00:00Z",
    **kwargs,
) -> dict:
    """Create a health entry and return the response JSON."""
    payload = {
        "child_id": child_id,
        "entry_type": entry_type,
        "severity": severity,
        "time": time,
        **kwargs,
    }
    resp = await async_client.post("/api/v1/health/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# CRUD Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_spit_up(async_client):
    """POST /api/v1/health/ creates a spit_up entry and returns 201."""
    child_id = await _create_child(async_client)
    data = await _create_health(async_client, child_id, entry_type="spit_up", severity="mild")

    assert data["id"] is not None
    assert data["child_id"] == child_id
    assert data["entry_type"] == "spit_up"
    assert data["severity"] == "mild"
    assert data["duration"] is None


@pytest.mark.anyio
async def test_create_tummy_ache(async_client):
    """POST /api/v1/health/ creates a tummy_ache entry with duration."""
    child_id = await _create_child(async_client)
    data = await _create_health(
        async_client, child_id,
        entry_type="tummy_ache", severity="moderate", duration="medium",
    )

    assert data["entry_type"] == "tummy_ache"
    assert data["severity"] == "moderate"
    assert data["duration"] == "medium"


@pytest.mark.anyio
async def test_create_tummy_ache_without_duration(async_client):
    """POST /api/v1/health/ creates a tummy_ache entry without duration (optional)."""
    child_id = await _create_child(async_client)
    data = await _create_health(
        async_client, child_id,
        entry_type="tummy_ache", severity="severe",
    )

    assert data["entry_type"] == "tummy_ache"
    assert data["duration"] is None


@pytest.mark.anyio
async def test_list_health_entries(async_client):
    """GET /api/v1/health/ returns all entries."""
    child_id = await _create_child(async_client)
    await _create_health(async_client, child_id)
    await _create_health(async_client, child_id, entry_type="tummy_ache", time="2026-04-19T11:00:00Z")

    resp = await async_client.get("/api/v1/health/")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 2


@pytest.mark.anyio
async def test_get_health_entry(async_client):
    """GET /api/v1/health/{id} returns a single entry."""
    child_id = await _create_child(async_client)
    created = await _create_health(async_client, child_id)

    resp = await async_client.get(f"/api/v1/health/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


@pytest.mark.anyio
async def test_get_health_entry_not_found(async_client):
    """GET /api/v1/health/{id} returns 404 for non-existent entry."""
    resp = await async_client.get("/api/v1/health/9999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_health_entry(async_client):
    """PATCH /api/v1/health/{id} updates fields."""
    child_id = await _create_child(async_client)
    created = await _create_health(async_client, child_id)

    resp = await async_client.patch(
        f"/api/v1/health/{created['id']}",
        json={"severity": "severe", "notes": "Viel gespuckt"},
    )
    assert resp.status_code == 200
    assert resp.json()["severity"] == "severe"
    assert resp.json()["notes"] == "Viel gespuckt"


@pytest.mark.anyio
async def test_update_health_entry_not_found(async_client):
    """PATCH /api/v1/health/{id} returns 404 for non-existent entry."""
    resp = await async_client.patch("/api/v1/health/9999", json={"severity": "mild"})
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_health_entry(async_client):
    """DELETE /api/v1/health/{id} removes the entry."""
    child_id = await _create_child(async_client)
    created = await _create_health(async_client, child_id)

    resp = await async_client.delete(f"/api/v1/health/{created['id']}")
    assert resp.status_code == 204

    # Verify it's gone
    resp = await async_client.get(f"/api/v1/health/{created['id']}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_health_entry_not_found(async_client):
    """DELETE /api/v1/health/{id} returns 404 for non-existent entry."""
    resp = await async_client.delete("/api/v1/health/9999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Filter Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_filter_by_child_id(async_client):
    """GET /api/v1/health/?child_id= filters correctly."""
    child1 = await _create_child(async_client, "Baby1")
    child2 = await _create_child(async_client, "Baby2")
    await _create_health(async_client, child1)
    await _create_health(async_client, child2)

    resp = await async_client.get(f"/api/v1/health/?child_id={child1}")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["child_id"] == child1


@pytest.mark.anyio
async def test_filter_by_entry_type(async_client):
    """GET /api/v1/health/?entry_type= filters correctly."""
    child_id = await _create_child(async_client)
    await _create_health(async_client, child_id, entry_type="spit_up")
    await _create_health(async_client, child_id, entry_type="tummy_ache", time="2026-04-19T11:00:00Z")

    resp = await async_client.get("/api/v1/health/?entry_type=tummy_ache")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["entry_type"] == "tummy_ache"


@pytest.mark.anyio
async def test_filter_by_date_range(async_client):
    """GET /api/v1/health/?date_from=&date_to= filters correctly."""
    child_id = await _create_child(async_client)
    await _create_health(async_client, child_id, time="2026-04-18T10:00:00Z")
    await _create_health(async_client, child_id, time="2026-04-19T10:00:00Z")

    resp = await async_client.get(
        "/api/v1/health/?date_from=2026-04-19T00:00:00Z&date_to=2026-04-19T23:59:59Z"
    )
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1


# ---------------------------------------------------------------------------
# Validation Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_duration_rejected_for_spit_up(async_client):
    """Duration is only allowed for tummy_ache entries."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/health/",
        json={
            "child_id": child_id,
            "entry_type": "spit_up",
            "severity": "mild",
            "time": "2026-04-19T10:00:00Z",
            "duration": "short",
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_invalid_entry_type(async_client):
    """Invalid entry_type must be rejected."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/health/",
        json={
            "child_id": child_id,
            "entry_type": "headache",
            "severity": "mild",
            "time": "2026-04-19T10:00:00Z",
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_invalid_severity(async_client):
    """Invalid severity must be rejected."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/health/",
        json={
            "child_id": child_id,
            "entry_type": "spit_up",
            "severity": "extreme",
            "time": "2026-04-19T10:00:00Z",
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_invalid_duration(async_client):
    """Invalid duration must be rejected."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/health/",
        json={
            "child_id": child_id,
            "entry_type": "tummy_ache",
            "severity": "mild",
            "time": "2026-04-19T10:00:00Z",
            "duration": "eternal",
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_notes_max_length(async_client):
    """Notes must not exceed 2000 characters."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/health/",
        json={
            "child_id": child_id,
            "entry_type": "spit_up",
            "severity": "mild",
            "time": "2026-04-19T10:00:00Z",
            "notes": "x" * 2001,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_create_with_notes(async_client):
    """POST /api/v1/health/ stores notes correctly."""
    child_id = await _create_child(async_client)
    data = await _create_health(
        async_client, child_id,
        notes="Nach dem Fuettern",
    )
    assert data["notes"] == "Nach dem Fuettern"


# ---------------------------------------------------------------------------
# Plugin Discovery Test
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_health_plugin_discovered():
    """HealthPlugin is discovered by the registry."""
    from app.plugins.registry import PluginRegistry

    registry = PluginRegistry()
    discovered = registry.discover()
    names = [p.name for p in discovered]
    assert "health" in names


@pytest.mark.anyio
async def test_health_plugin_widgets():
    """HealthPlugin exposes a health_summary widget."""
    from app.plugins.health import HealthPlugin

    plugin = HealthPlugin()
    widgets = plugin.register_widgets()
    assert len(widgets) == 1
    assert widgets[0].name == "health_summary"
    assert widgets[0].size == "small"
