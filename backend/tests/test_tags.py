"""Tests for the Tag CRUD API and entry-tag associations."""

import pytest
from httpx import AsyncClient


# --- Helper ---


async def _create_child(client: AsyncClient) -> int:
    resp = await client.post(
        "/api/v1/children/",
        json={"name": "Tag Test Baby", "birth_date": "2025-06-01"},
    )
    return resp.json()["id"]


async def _create_tag(client: AsyncClient, child_id: int, name: str = "Kinderarzt", color: str = "#8839ef") -> dict:
    resp = await client.post(
        "/api/v1/tags/",
        json={"child_id": child_id, "name": name, "color": color},
    )
    assert resp.status_code == 201
    return resp.json()


# --- Tag CRUD Tests ---


@pytest.mark.anyio
async def test_create_tag(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    data = await _create_tag(async_client, child_id)
    assert data["name"] == "Kinderarzt"
    assert data["color"] == "#8839ef"
    assert data["child_id"] == child_id
    assert "id" in data


@pytest.mark.anyio
async def test_create_tag_custom_color(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    data = await _create_tag(async_client, child_id, name="Hebamme", color="#ea76cb")
    assert data["color"] == "#ea76cb"


@pytest.mark.anyio
async def test_create_duplicate_tag_fails(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    await _create_tag(async_client, child_id, name="Duplikat")
    resp = await async_client.post(
        "/api/v1/tags/",
        json={"child_id": child_id, "name": "Duplikat"},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_list_tags(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    await _create_tag(async_client, child_id, name="Tag A")
    await _create_tag(async_client, child_id, name="Tag B")
    resp = await async_client.get(f"/api/v1/tags/?child_id={child_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.anyio
async def test_get_tag(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    tag = await _create_tag(async_client, child_id)
    resp = await async_client.get(f"/api/v1/tags/{tag['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Kinderarzt"


@pytest.mark.anyio
async def test_get_nonexistent_tag(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/tags/999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_tag(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    tag = await _create_tag(async_client, child_id)
    resp = await async_client.patch(
        f"/api/v1/tags/{tag['id']}",
        json={"name": "Hebamme", "color": "#40a02b"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Hebamme"
    assert resp.json()["color"] == "#40a02b"


@pytest.mark.anyio
async def test_update_tag_duplicate_name_fails(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    await _create_tag(async_client, child_id, name="Existing")
    tag2 = await _create_tag(async_client, child_id, name="Other")
    resp = await async_client.patch(
        f"/api/v1/tags/{tag2['id']}",
        json={"name": "Existing"},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_delete_tag(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    tag = await _create_tag(async_client, child_id)
    resp = await async_client.delete(f"/api/v1/tags/{tag['id']}")
    assert resp.status_code == 204
    resp = await async_client.get(f"/api/v1/tags/{tag['id']}")
    assert resp.status_code == 404


# --- Validation Tests ---


@pytest.mark.anyio
async def test_tag_name_required(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/tags/",
        json={"child_id": child_id},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_tag_invalid_color(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/tags/",
        json={"child_id": child_id, "name": "Bad Color", "color": "red"},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_tag_name_max_length(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/tags/",
        json={"child_id": child_id, "name": "x" * 101},
    )
    assert resp.status_code == 422


# --- Entry-Tag Association Tests ---


@pytest.mark.anyio
async def test_attach_tag_to_entry(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    tag = await _create_tag(async_client, child_id)

    # Create a sleep entry to tag
    sleep_resp = await async_client.post(
        "/api/v1/sleep/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-20T20:00:00Z",
            "sleep_type": "night",
        },
    )
    sleep_id = sleep_resp.json()["id"]

    resp = await async_client.post(
        "/api/v1/tags/entries",
        json={"tag_id": tag["id"], "entry_type": "sleep", "entry_id": sleep_id},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["tag_id"] == tag["id"]
    assert data["entry_type"] == "sleep"
    assert data["entry_id"] == sleep_id
    assert data["tag"]["name"] == "Kinderarzt"


@pytest.mark.anyio
async def test_attach_duplicate_fails(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    tag = await _create_tag(async_client, child_id)
    sleep_resp = await async_client.post(
        "/api/v1/sleep/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-20T21:00:00Z",
            "sleep_type": "nap",
        },
    )
    sleep_id = sleep_resp.json()["id"]

    payload = {"tag_id": tag["id"], "entry_type": "sleep", "entry_id": sleep_id}
    await async_client.post("/api/v1/tags/entries", json=payload)
    resp = await async_client.post("/api/v1/tags/entries", json=payload)
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_attach_invalid_entry_type(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    tag = await _create_tag(async_client, child_id)
    resp = await async_client.post(
        "/api/v1/tags/entries",
        json={"tag_id": tag["id"], "entry_type": "invalid", "entry_id": 1},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_detach_tag(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    tag = await _create_tag(async_client, child_id)
    sleep_resp = await async_client.post(
        "/api/v1/sleep/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-20T22:00:00Z",
            "sleep_type": "nap",
        },
    )
    sleep_id = sleep_resp.json()["id"]

    attach_resp = await async_client.post(
        "/api/v1/tags/entries",
        json={"tag_id": tag["id"], "entry_type": "sleep", "entry_id": sleep_id},
    )
    entry_tag_id = attach_resp.json()["id"]

    resp = await async_client.delete(f"/api/v1/tags/entries/{entry_tag_id}")
    assert resp.status_code == 204


@pytest.mark.anyio
async def test_list_entry_tags(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    tag1 = await _create_tag(async_client, child_id, name="Tag1")
    tag2 = await _create_tag(async_client, child_id, name="Tag2")

    sleep_resp = await async_client.post(
        "/api/v1/sleep/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-20T23:00:00Z",
            "sleep_type": "night",
        },
    )
    sleep_id = sleep_resp.json()["id"]

    await async_client.post(
        "/api/v1/tags/entries",
        json={"tag_id": tag1["id"], "entry_type": "sleep", "entry_id": sleep_id},
    )
    await async_client.post(
        "/api/v1/tags/entries",
        json={"tag_id": tag2["id"], "entry_type": "sleep", "entry_id": sleep_id},
    )

    resp = await async_client.get(f"/api/v1/tags/entries/?entry_type=sleep&entry_id={sleep_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.anyio
async def test_delete_tag_cascades_entry_tags(async_client: AsyncClient):
    """Deleting a tag removes all its entry-tag associations."""
    child_id = await _create_child(async_client)
    tag = await _create_tag(async_client, child_id, name="Cascade")

    sleep_resp = await async_client.post(
        "/api/v1/sleep/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-21T00:00:00Z",
            "sleep_type": "nap",
        },
    )
    sleep_id = sleep_resp.json()["id"]

    await async_client.post(
        "/api/v1/tags/entries",
        json={"tag_id": tag["id"], "entry_type": "sleep", "entry_id": sleep_id},
    )

    await async_client.delete(f"/api/v1/tags/{tag['id']}")

    resp = await async_client.get(f"/api/v1/tags/entries/?entry_type=sleep&entry_id={sleep_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 0
