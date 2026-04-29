"""Tests for the MotherHealth plugin (MBT-109) — postpartum / midwife notes."""

import pytest
from httpx import AsyncClient


async def _create_child(client: AsyncClient) -> int:
    resp = await client.post(
        "/api/v1/children/",
        json={"name": "Test Baby", "birth_date": "2025-06-01"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_entry(client: AsyncClient, child_id: int, **kwargs) -> dict:
    data = {
        "child_id": child_id,
        "content": kwargs.get("content", "Hebammen-Visite: alles gut."),
    }
    resp = await client.post("/api/v1/motherhealth/", json=data)
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# CRUD Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_create_entry(async_client):
    """POST /api/v1/motherhealth/ creates an entry."""
    child_id = await _create_child(async_client)
    data = await _create_entry(
        async_client, child_id, content="Wochenbett Tag 3, alles in Ordnung."
    )
    assert data["content"] == "Wochenbett Tag 3, alles in Ordnung."
    assert data["child_id"] == child_id


@pytest.mark.anyio
async def test_list_entries(async_client):
    """GET /api/v1/motherhealth/ returns all entries."""
    child_id = await _create_child(async_client)
    await _create_entry(async_client, child_id, content="Eintrag 1")
    await _create_entry(async_client, child_id, content="Eintrag 2")

    resp = await async_client.get(f"/api/v1/motherhealth/?child_id={child_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.anyio
async def test_get_entry(async_client):
    """GET /api/v1/motherhealth/{id} returns a single entry."""
    child_id = await _create_child(async_client)
    entry = await _create_entry(async_client, child_id)

    resp = await async_client.get(f"/api/v1/motherhealth/{entry['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == entry["id"]


@pytest.mark.anyio
async def test_get_entry_not_found(async_client):
    """GET /api/v1/motherhealth/999 returns 404."""
    resp = await async_client.get("/api/v1/motherhealth/999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_entry(async_client):
    """PATCH /api/v1/motherhealth/{id} updates entry."""
    child_id = await _create_child(async_client)
    entry = await _create_entry(async_client, child_id)

    resp = await async_client.patch(
        f"/api/v1/motherhealth/{entry['id']}", json={"content": "Aktualisiert"}
    )
    assert resp.status_code == 200
    assert resp.json()["content"] == "Aktualisiert"


@pytest.mark.anyio
async def test_delete_entry(async_client):
    """DELETE /api/v1/motherhealth/{id} removes entry."""
    child_id = await _create_child(async_client)
    entry = await _create_entry(async_client, child_id)

    resp = await async_client.delete(f"/api/v1/motherhealth/{entry['id']}")
    assert resp.status_code == 204

    resp = await async_client.get(f"/api/v1/motherhealth/{entry['id']}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_content_required(async_client):
    """Empty content rejected (min_length=1)."""
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={"child_id": child_id, "content": ""},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_content_max_length_4000(async_client):
    """Content max 4000 chars (acceptance criterion)."""
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={"child_id": child_id, "content": "x" * 4001},
    )
    assert resp.status_code == 422

    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={"child_id": child_id, "content": "x" * 4000},
    )
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_list_sorted_newest_first(async_client):
    """List returns entries newest first (created_at desc)."""
    child_id = await _create_child(async_client)
    e1 = await _create_entry(async_client, child_id, content="First")
    e2 = await _create_entry(async_client, child_id, content="Second")

    resp = await async_client.get(f"/api/v1/motherhealth/?child_id={child_id}")
    entries = resp.json()
    assert entries[0]["id"] == e2["id"]
    assert entries[1]["id"] == e1["id"]


@pytest.mark.anyio
async def test_plugin_discovery(async_client):
    """MotherHealth plugin is auto-discovered (router accessible)."""
    child_id = await _create_child(async_client)
    entry = await _create_entry(async_client, child_id)
    assert entry["id"] > 0
