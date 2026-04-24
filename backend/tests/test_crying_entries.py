"""Tests for crying entry type in Health plugin."""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient


async def _create_child(client: AsyncClient) -> int:
    resp = await client.post("/api/v1/children/", json={
        "name": "Test Baby", "birth_date": "2025-06-01",
    })
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.mark.anyio
async def test_create_crying_entry(async_client):
    """POST /api/v1/health/ creates a crying entry with soothing method."""
    child_id = await _create_child(async_client)

    resp = await async_client.post("/api/v1/health/", json={
        "child_id": child_id,
        "entry_type": "crying",
        "severity": "moderate",
        "duration": "medium",
        "duration_minutes": 30,
        "soothing_method": "rocking",
        "time": "2025-07-01T14:00:00Z",
        "notes": "After feeding",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["entry_type"] == "crying"
    assert data["duration"] == "medium"
    assert data["duration_minutes"] == 30
    assert data["soothing_method"] == "rocking"


@pytest.mark.anyio
async def test_crying_without_soothing(async_client):
    """Crying entry without soothing method is valid."""
    child_id = await _create_child(async_client)

    resp = await async_client.post("/api/v1/health/", json={
        "child_id": child_id,
        "entry_type": "crying",
        "severity": "severe",
        "time": "2025-07-01T14:00:00Z",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["soothing_method"] is None
    assert data["duration_minutes"] is None


@pytest.mark.anyio
async def test_soothing_only_for_crying(async_client):
    """Soothing method is rejected for non-crying entries."""
    child_id = await _create_child(async_client)

    resp = await async_client.post("/api/v1/health/", json={
        "child_id": child_id,
        "entry_type": "spit_up",
        "severity": "mild",
        "soothing_method": "rocking",
        "time": "2025-07-01T14:00:00Z",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_duration_valid_for_crying(async_client):
    """Duration is allowed for crying entries."""
    child_id = await _create_child(async_client)

    resp = await async_client.post("/api/v1/health/", json={
        "child_id": child_id,
        "entry_type": "crying",
        "severity": "mild",
        "duration": "short",
        "time": "2025-07-01T14:00:00Z",
    })
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_filter_by_crying_type(async_client):
    """GET /api/v1/health/?entry_type=crying filters correctly."""
    child_id = await _create_child(async_client)

    await async_client.post("/api/v1/health/", json={
        "child_id": child_id, "entry_type": "spit_up",
        "severity": "mild", "time": "2025-07-01T10:00:00Z",
    })
    await async_client.post("/api/v1/health/", json={
        "child_id": child_id, "entry_type": "crying",
        "severity": "moderate", "time": "2025-07-01T14:00:00Z",
    })

    resp = await async_client.get(f"/api/v1/health/?child_id={child_id}&entry_type=crying")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["entry_type"] == "crying"


@pytest.mark.anyio
async def test_update_crying_entry(async_client):
    """PATCH updates crying-specific fields."""
    child_id = await _create_child(async_client)

    create_resp = await async_client.post("/api/v1/health/", json={
        "child_id": child_id, "entry_type": "crying",
        "severity": "mild", "time": "2025-07-01T14:00:00Z",
    })
    entry_id = create_resp.json()["id"]

    resp = await async_client.patch(f"/api/v1/health/{entry_id}", json={
        "soothing_method": "nursing",
        "duration_minutes": 15,
    })
    assert resp.status_code == 200
    assert resp.json()["soothing_method"] == "nursing"
    assert resp.json()["duration_minutes"] == 15


@pytest.mark.anyio
async def test_all_soothing_methods(async_client):
    """All defined soothing methods are accepted."""
    child_id = await _create_child(async_client)
    methods = ["nursing", "rocking", "carrying", "pacifier", "singing", "white_noise", "swaddling", "other"]

    for method in methods:
        resp = await async_client.post("/api/v1/health/", json={
            "child_id": child_id, "entry_type": "crying",
            "severity": "mild", "soothing_method": method,
            "time": "2025-07-01T14:00:00Z",
        })
        assert resp.status_code == 201, f"Method {method} failed"
