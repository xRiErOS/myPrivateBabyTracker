"""Tests for the Weight plugin — CRUD, filters, validation, discovery."""

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_child(async_client: AsyncClient, name: str = "TestBaby") -> int:
    resp = await async_client.post(
        "/api/v1/children/",
        json={"name": name, "birth_date": "2025-01-01"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_weight(
    async_client: AsyncClient,
    child_id: int,
    measured_at: str = "2026-04-20T08:00:00Z",
    weight_grams: int = 4500,
    **kwargs,
) -> dict:
    payload = {
        "child_id": child_id,
        "measured_at": measured_at,
        "weight_grams": weight_grams,
        **kwargs,
    }
    resp = await async_client.post("/api/v1/weight/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# CRUD Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_weight_entry(async_client):
    child_id = await _create_child(async_client)
    data = await _create_weight(async_client, child_id)
    assert data["id"] is not None
    assert data["child_id"] == child_id
    assert data["weight_grams"] == 4500


@pytest.mark.anyio
async def test_create_weight_with_notes(async_client):
    child_id = await _create_child(async_client)
    data = await _create_weight(async_client, child_id, notes="Vor dem Fuettern")
    assert data["notes"] == "Vor dem Fuettern"


@pytest.mark.anyio
async def test_list_weight_entries(async_client):
    child_id = await _create_child(async_client)
    await _create_weight(async_client, child_id)
    await _create_weight(async_client, child_id, measured_at="2026-04-21T08:00:00Z", weight_grams=4550)
    resp = await async_client.get("/api/v1/weight/")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.anyio
async def test_get_weight_entry(async_client):
    child_id = await _create_child(async_client)
    created = await _create_weight(async_client, child_id)
    resp = await async_client.get(f"/api/v1/weight/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["weight_grams"] == 4500


@pytest.mark.anyio
async def test_get_weight_not_found(async_client):
    resp = await async_client.get("/api/v1/weight/9999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_weight_entry(async_client):
    child_id = await _create_child(async_client)
    created = await _create_weight(async_client, child_id)
    resp = await async_client.patch(
        f"/api/v1/weight/{created['id']}",
        json={"weight_grams": 4600, "notes": "Korrektur"},
    )
    assert resp.status_code == 200
    assert resp.json()["weight_grams"] == 4600
    assert resp.json()["notes"] == "Korrektur"


@pytest.mark.anyio
async def test_update_weight_not_found(async_client):
    resp = await async_client.patch("/api/v1/weight/9999", json={"weight_grams": 5000})
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_weight_entry(async_client):
    child_id = await _create_child(async_client)
    created = await _create_weight(async_client, child_id)
    resp = await async_client.delete(f"/api/v1/weight/{created['id']}")
    assert resp.status_code == 204
    resp = await async_client.get(f"/api/v1/weight/{created['id']}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_weight_not_found(async_client):
    resp = await async_client.delete("/api/v1/weight/9999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Filter Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_filter_by_child_id(async_client):
    child1 = await _create_child(async_client, "Baby1")
    child2 = await _create_child(async_client, "Baby2")
    await _create_weight(async_client, child1)
    await _create_weight(async_client, child2)
    resp = await async_client.get(f"/api/v1/weight/?child_id={child1}")
    assert len(resp.json()) == 1
    assert resp.json()[0]["child_id"] == child1


@pytest.mark.anyio
async def test_filter_by_date_range(async_client):
    child_id = await _create_child(async_client)
    await _create_weight(async_client, child_id, measured_at="2026-04-18T08:00:00Z")
    await _create_weight(async_client, child_id, measured_at="2026-04-20T08:00:00Z")
    resp = await async_client.get(
        "/api/v1/weight/?date_from=2026-04-20T00:00:00Z&date_to=2026-04-20T23:59:59Z"
    )
    assert len(resp.json()) == 1


# ---------------------------------------------------------------------------
# Validation Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_weight_too_low(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post("/api/v1/weight/", json={
        "child_id": child_id, "measured_at": "2026-04-20T08:00:00Z", "weight_grams": 499,
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_weight_too_high(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post("/api/v1/weight/", json={
        "child_id": child_id, "measured_at": "2026-04-20T08:00:00Z", "weight_grams": 30001,
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_weight_boundary_low(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post("/api/v1/weight/", json={
        "child_id": child_id, "measured_at": "2026-04-20T08:00:00Z", "weight_grams": 500,
    })
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_weight_boundary_high(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post("/api/v1/weight/", json={
        "child_id": child_id, "measured_at": "2026-04-20T08:00:00Z", "weight_grams": 30000,
    })
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_notes_max_length(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post("/api/v1/weight/", json={
        "child_id": child_id, "measured_at": "2026-04-20T08:00:00Z",
        "weight_grams": 4500, "notes": "x" * 2001,
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_utc_serialization(async_client):
    child_id = await _create_child(async_client)
    data = await _create_weight(async_client, child_id)
    assert data["measured_at"].endswith("Z")
    assert data["created_at"].endswith("Z")


# ---------------------------------------------------------------------------
# Plugin Discovery Test
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_weight_plugin_discovered():
    from app.plugins.registry import PluginRegistry
    registry = PluginRegistry()
    discovered = registry.discover()
    names = [p.name for p in discovered]
    assert "weight" in names


@pytest.mark.anyio
async def test_weight_plugin_widgets():
    from app.plugins.weight import WeightPlugin
    plugin = WeightPlugin()
    widgets = plugin.register_widgets()
    assert len(widgets) == 1
    assert widgets[0].name == "weight_latest"
