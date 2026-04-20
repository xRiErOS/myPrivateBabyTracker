"""Tests for the MedicationMaster CRUD API."""

import pytest
from httpx import AsyncClient


# --- CRUD Tests ---


@pytest.mark.anyio
async def test_create_medication_master(async_client: AsyncClient):
    """POST /api/v1/medication-masters/ creates a new master entry."""
    payload = {
        "name": "Paracetamol",
        "active_ingredient": "Paracetamol 125mg",
        "default_unit": "ml",
    }
    resp = await async_client.post("/api/v1/medication-masters/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Paracetamol"
    assert data["active_ingredient"] == "Paracetamol 125mg"
    assert data["default_unit"] == "ml"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.anyio
async def test_create_medication_master_minimal(async_client: AsyncClient):
    """POST with only required fields."""
    resp = await async_client.post(
        "/api/v1/medication-masters/",
        json={"name": "Ibuprofen"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Ibuprofen"
    assert data["default_unit"] == "Tablette"  # default
    assert data["active_ingredient"] is None


@pytest.mark.anyio
async def test_list_medication_masters(async_client: AsyncClient):
    """GET /api/v1/medication-masters/ returns list."""
    await async_client.post(
        "/api/v1/medication-masters/",
        json={"name": "Med A"},
    )
    await async_client.post(
        "/api/v1/medication-masters/",
        json={"name": "Med B"},
    )
    resp = await async_client.get("/api/v1/medication-masters/")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.anyio
async def test_list_active_only_filter(async_client: AsyncClient):
    """GET with active_only=true filters inactive entries."""
    create_resp = await async_client.post(
        "/api/v1/medication-masters/",
        json={"name": "Active Med"},
    )
    inactive_resp = await async_client.post(
        "/api/v1/medication-masters/",
        json={"name": "Inactive Med"},
    )
    inactive_id = inactive_resp.json()["id"]
    await async_client.patch(
        f"/api/v1/medication-masters/{inactive_id}",
        json={"is_active": False},
    )

    # active_only=true (default)
    resp = await async_client.get("/api/v1/medication-masters/?active_only=true")
    names = [m["name"] for m in resp.json()]
    assert "Active Med" in names
    assert "Inactive Med" not in names

    # active_only=false
    resp = await async_client.get("/api/v1/medication-masters/?active_only=false")
    assert len(resp.json()) == 2


@pytest.mark.anyio
async def test_get_medication_master(async_client: AsyncClient):
    """GET /api/v1/medication-masters/{id} returns single entry."""
    create_resp = await async_client.post(
        "/api/v1/medication-masters/",
        json={"name": "Vitamin D3", "default_unit": "Tropfen"},
    )
    entry_id = create_resp.json()["id"]

    resp = await async_client.get(f"/api/v1/medication-masters/{entry_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Vitamin D3"


@pytest.mark.anyio
async def test_get_nonexistent_master(async_client: AsyncClient):
    """GET /api/v1/medication-masters/999 returns 404."""
    resp = await async_client.get("/api/v1/medication-masters/999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_medication_master(async_client: AsyncClient):
    """PATCH /api/v1/medication-masters/{id} updates fields."""
    create_resp = await async_client.post(
        "/api/v1/medication-masters/",
        json={"name": "Old Name"},
    )
    entry_id = create_resp.json()["id"]

    resp = await async_client.patch(
        f"/api/v1/medication-masters/{entry_id}",
        json={"name": "New Name", "default_unit": "Tropfen"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"
    assert resp.json()["default_unit"] == "Tropfen"


@pytest.mark.anyio
async def test_delete_medication_master(async_client: AsyncClient):
    """DELETE /api/v1/medication-masters/{id} removes entry."""
    create_resp = await async_client.post(
        "/api/v1/medication-masters/",
        json={"name": "To Delete"},
    )
    entry_id = create_resp.json()["id"]

    resp = await async_client.delete(f"/api/v1/medication-masters/{entry_id}")
    assert resp.status_code == 204

    resp = await async_client.get(f"/api/v1/medication-masters/{entry_id}")
    assert resp.status_code == 404


# --- Validation Tests ---


@pytest.mark.anyio
async def test_name_required(async_client: AsyncClient):
    """POST without name returns 422."""
    resp = await async_client.post(
        "/api/v1/medication-masters/",
        json={"default_unit": "ml"},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_name_max_length(async_client: AsyncClient):
    """POST with name exceeding 200 chars returns 422."""
    resp = await async_client.post(
        "/api/v1/medication-masters/",
        json={"name": "x" * 201},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_medication_entry_with_master_id(async_client: AsyncClient):
    """MedicationEntry can reference a MedicationMaster."""
    # Create child
    child_resp = await async_client.post(
        "/api/v1/children/",
        json={"name": "Test Baby", "birth_date": "2025-01-01"},
    )
    child_id = child_resp.json()["id"]

    # Create master
    master_resp = await async_client.post(
        "/api/v1/medication-masters/",
        json={"name": "Paracetamol", "default_unit": "ml"},
    )
    master_id = master_resp.json()["id"]

    # Create medication entry with master reference
    entry_resp = await async_client.post(
        "/api/v1/medication/",
        json={
            "child_id": child_id,
            "given_at": "2026-04-20T10:00:00Z",
            "medication_name": "Paracetamol",
            "medication_master_id": master_id,
            "dose": "2.5 ml",
        },
    )
    assert entry_resp.status_code == 201
    data = entry_resp.json()
    assert data["medication_master_id"] == master_id
    assert data["medication_name"] == "Paracetamol"
