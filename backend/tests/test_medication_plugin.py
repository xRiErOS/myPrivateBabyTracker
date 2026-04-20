"""Tests for the Medication plugin — CRUD, filters, validation, discovery."""

import pytest
from httpx import AsyncClient


async def _create_child(async_client: AsyncClient, name: str = "TestBaby") -> int:
    resp = await async_client.post(
        "/api/v1/children/",
        json={"name": name, "birth_date": "2025-01-01"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_medication(
    async_client: AsyncClient,
    child_id: int,
    given_at: str = "2026-04-20T08:00:00Z",
    medication_name: str = "Paracetamol",
    dose: str | None = "2.5 ml",
    **kwargs,
) -> dict:
    payload = {
        "child_id": child_id,
        "given_at": given_at,
        "medication_name": medication_name,
        **kwargs,
    }
    if dose is not None:
        payload["dose"] = dose
    resp = await async_client.post("/api/v1/medication/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# CRUD Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_medication(async_client):
    child_id = await _create_child(async_client)
    data = await _create_medication(async_client, child_id)
    assert data["medication_name"] == "Paracetamol"
    assert data["dose"] == "2.5 ml"


@pytest.mark.anyio
async def test_create_medication_without_dose(async_client):
    child_id = await _create_child(async_client)
    data = await _create_medication(async_client, child_id, dose=None)
    assert data["dose"] is None


@pytest.mark.anyio
async def test_create_medication_with_notes(async_client):
    child_id = await _create_child(async_client)
    data = await _create_medication(async_client, child_id, notes="Wegen Fieber")
    assert data["notes"] == "Wegen Fieber"


@pytest.mark.anyio
async def test_list_medication(async_client):
    child_id = await _create_child(async_client)
    await _create_medication(async_client, child_id)
    await _create_medication(async_client, child_id, given_at="2026-04-20T14:00:00Z", medication_name="Ibuprofen")
    resp = await async_client.get("/api/v1/medication/")
    assert len(resp.json()) == 2


@pytest.mark.anyio
async def test_get_medication(async_client):
    child_id = await _create_child(async_client)
    created = await _create_medication(async_client, child_id)
    resp = await async_client.get(f"/api/v1/medication/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["medication_name"] == "Paracetamol"


@pytest.mark.anyio
async def test_get_medication_not_found(async_client):
    resp = await async_client.get("/api/v1/medication/9999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_medication(async_client):
    child_id = await _create_child(async_client)
    created = await _create_medication(async_client, child_id)
    resp = await async_client.patch(
        f"/api/v1/medication/{created['id']}",
        json={"dose": "5 ml", "notes": "Dosis erhoeht"},
    )
    assert resp.status_code == 200
    assert resp.json()["dose"] == "5 ml"


@pytest.mark.anyio
async def test_update_medication_not_found(async_client):
    resp = await async_client.patch("/api/v1/medication/9999", json={"dose": "5 ml"})
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_medication(async_client):
    child_id = await _create_child(async_client)
    created = await _create_medication(async_client, child_id)
    resp = await async_client.delete(f"/api/v1/medication/{created['id']}")
    assert resp.status_code == 204
    resp = await async_client.get(f"/api/v1/medication/{created['id']}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_medication_not_found(async_client):
    resp = await async_client.delete("/api/v1/medication/9999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Filter Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_filter_by_child_id(async_client):
    child1 = await _create_child(async_client, "Baby1")
    child2 = await _create_child(async_client, "Baby2")
    await _create_medication(async_client, child1)
    await _create_medication(async_client, child2)
    resp = await async_client.get(f"/api/v1/medication/?child_id={child1}")
    assert len(resp.json()) == 1


@pytest.mark.anyio
async def test_filter_by_medication_name(async_client):
    child_id = await _create_child(async_client)
    await _create_medication(async_client, child_id, medication_name="Paracetamol")
    await _create_medication(async_client, child_id, given_at="2026-04-20T14:00:00Z", medication_name="Ibuprofen")
    resp = await async_client.get("/api/v1/medication/?medication_name=Ibuprofen")
    assert len(resp.json()) == 1
    assert resp.json()[0]["medication_name"] == "Ibuprofen"


@pytest.mark.anyio
async def test_filter_by_date_range(async_client):
    child_id = await _create_child(async_client)
    await _create_medication(async_client, child_id, given_at="2026-04-18T08:00:00Z")
    await _create_medication(async_client, child_id, given_at="2026-04-20T08:00:00Z")
    resp = await async_client.get(
        "/api/v1/medication/?date_from=2026-04-20T00:00:00Z&date_to=2026-04-20T23:59:59Z"
    )
    assert len(resp.json()) == 1


# ---------------------------------------------------------------------------
# Validation Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_medication_name_required(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post("/api/v1/medication/", json={
        "child_id": child_id, "given_at": "2026-04-20T08:00:00Z",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_medication_name_empty_rejected(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post("/api/v1/medication/", json={
        "child_id": child_id, "given_at": "2026-04-20T08:00:00Z",
        "medication_name": "",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_medication_name_max_length(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post("/api/v1/medication/", json={
        "child_id": child_id, "given_at": "2026-04-20T08:00:00Z",
        "medication_name": "x" * 201,
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_dose_max_length(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post("/api/v1/medication/", json={
        "child_id": child_id, "given_at": "2026-04-20T08:00:00Z",
        "medication_name": "Test", "dose": "x" * 101,
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_notes_max_length(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post("/api/v1/medication/", json={
        "child_id": child_id, "given_at": "2026-04-20T08:00:00Z",
        "medication_name": "Test", "notes": "x" * 2001,
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_utc_serialization(async_client):
    child_id = await _create_child(async_client)
    data = await _create_medication(async_client, child_id)
    assert data["given_at"].endswith("Z")
    assert data["created_at"].endswith("Z")


# ---------------------------------------------------------------------------
# Plugin Discovery Test
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_medication_plugin_discovered():
    from app.plugins.registry import PluginRegistry
    registry = PluginRegistry()
    discovered = registry.discover()
    names = [p.name for p in discovered]
    assert "medication" in names


@pytest.mark.anyio
async def test_medication_plugin_widgets():
    from app.plugins.medication import MedicationPlugin
    plugin = MedicationPlugin()
    widgets = plugin.register_widgets()
    assert len(widgets) == 1
    assert widgets[0].name == "medication_today"
