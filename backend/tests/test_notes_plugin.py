"""Tests for the Notes plugin — shared parent notes CRUD."""

import pytest
from httpx import AsyncClient


async def _create_child(client: AsyncClient) -> int:
    resp = await client.post("/api/v1/children/", json={
        "name": "Test Baby", "birth_date": "2025-06-01",
    })
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_note(client: AsyncClient, child_id: int, **kwargs) -> dict:
    data = {
        "child_id": child_id,
        "title": kwargs.get("title", "Test Note"),
        "content": kwargs.get("content", "Some content"),
        "pinned": kwargs.get("pinned", False),
    }
    resp = await client.post("/api/v1/notes/", json=data)
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# CRUD Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_create_note(async_client):
    """POST /api/v1/notes/ creates a note."""
    child_id = await _create_child(async_client)
    data = await _create_note(async_client, child_id, title="Shopping list", content="Windeln kaufen")

    assert data["title"] == "Shopping list"
    assert data["content"] == "Windeln kaufen"
    assert data["pinned"] is False
    assert data["child_id"] == child_id


@pytest.mark.anyio
async def test_list_notes(async_client):
    """GET /api/v1/notes/ returns all notes."""
    child_id = await _create_child(async_client)
    await _create_note(async_client, child_id, title="Note 1")
    await _create_note(async_client, child_id, title="Note 2")

    resp = await async_client.get(f"/api/v1/notes/?child_id={child_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.anyio
async def test_get_note(async_client):
    """GET /api/v1/notes/{id} returns a single note."""
    child_id = await _create_child(async_client)
    note = await _create_note(async_client, child_id)

    resp = await async_client.get(f"/api/v1/notes/{note['id']}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Test Note"


@pytest.mark.anyio
async def test_get_note_not_found(async_client):
    """GET /api/v1/notes/999 returns 404."""
    resp = await async_client.get("/api/v1/notes/999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_note(async_client):
    """PATCH /api/v1/notes/{id} updates note."""
    child_id = await _create_child(async_client)
    note = await _create_note(async_client, child_id)

    resp = await async_client.patch(f"/api/v1/notes/{note['id']}", json={
        "title": "Updated title",
        "content": "Updated content",
    })
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated title"
    assert resp.json()["content"] == "Updated content"


@pytest.mark.anyio
async def test_delete_note(async_client):
    """DELETE /api/v1/notes/{id} removes note."""
    child_id = await _create_child(async_client)
    note = await _create_note(async_client, child_id)

    resp = await async_client.delete(f"/api/v1/notes/{note['id']}")
    assert resp.status_code == 204

    resp = await async_client.get(f"/api/v1/notes/{note['id']}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_pin_note(async_client):
    """PATCH /api/v1/notes/{id} toggles pin."""
    child_id = await _create_child(async_client)
    note = await _create_note(async_client, child_id)

    resp = await async_client.patch(f"/api/v1/notes/{note['id']}", json={"pinned": True})
    assert resp.status_code == 200
    assert resp.json()["pinned"] is True

    resp = await async_client.patch(f"/api/v1/notes/{note['id']}", json={"pinned": False})
    assert resp.json()["pinned"] is False


@pytest.mark.anyio
async def test_pinned_first_in_list(async_client):
    """Pinned notes appear first in list."""
    child_id = await _create_child(async_client)
    note1 = await _create_note(async_client, child_id, title="Unpinned")
    note2 = await _create_note(async_client, child_id, title="Pinned", pinned=True)

    resp = await async_client.get(f"/api/v1/notes/?child_id={child_id}")
    entries = resp.json()
    assert entries[0]["title"] == "Pinned"
    assert entries[1]["title"] == "Unpinned"


@pytest.mark.anyio
async def test_note_validation(async_client):
    """Title is required, max 200 chars."""
    child_id = await _create_child(async_client)

    # Empty title
    resp = await async_client.post("/api/v1/notes/", json={
        "child_id": child_id, "title": "", "content": "test",
    })
    assert resp.status_code == 422

    # Title too long
    resp = await async_client.post("/api/v1/notes/", json={
        "child_id": child_id, "title": "x" * 201, "content": "test",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_note_content_max_length(async_client):
    """Content max 5000 chars."""
    child_id = await _create_child(async_client)

    resp = await async_client.post("/api/v1/notes/", json={
        "child_id": child_id, "title": "Test", "content": "x" * 5001,
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_plugin_discovery(async_client):
    """Notes plugin is auto-discovered."""
    # If we can create a note, the plugin is loaded
    child_id = await _create_child(async_client)
    note = await _create_note(async_client, child_id)
    assert note["id"] > 0
