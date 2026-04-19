"""Tests for the VitaminD3 plugin — CRUD, double-entry protection, filters."""

import pytest
from httpx import AsyncClient


async def _create_child(async_client: AsyncClient, name: str = "TestBaby") -> int:
    """Create a child and return its ID."""
    resp = await async_client.post(
        "/api/v1/children/",
        json={"name": name, "birth_date": "2025-01-01"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _give_d3(
    async_client: AsyncClient,
    child_id: int,
    date: str = "2026-04-19",
) -> dict:
    """Record VitaminD3 and return response JSON."""
    resp = await async_client.post(
        "/api/v1/vitamind3/",
        json={"child_id": child_id, "date": date},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.mark.anyio
async def test_create_vitamind3(async_client):
    """POST /api/v1/vitamind3/ creates an entry and returns 201."""
    child_id = await _create_child(async_client)
    data = await _give_d3(async_client, child_id)
    assert data["id"] is not None
    assert data["child_id"] == child_id
    assert data["date"] == "2026-04-19"
    assert data["given_at"] is not None


@pytest.mark.anyio
async def test_double_entry_protection(async_client):
    """POST same child+date twice returns 422."""
    child_id = await _create_child(async_client)
    await _give_d3(async_client, child_id, "2026-04-19")

    resp = await async_client.post(
        "/api/v1/vitamind3/",
        json={"child_id": child_id, "date": "2026-04-19"},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_different_dates_allowed(async_client):
    """Two entries on different dates for same child are allowed."""
    child_id = await _create_child(async_client)
    await _give_d3(async_client, child_id, "2026-04-18")
    data = await _give_d3(async_client, child_id, "2026-04-19")
    assert data["date"] == "2026-04-19"


@pytest.mark.anyio
async def test_list_vitamind3(async_client):
    """GET /api/v1/vitamind3/ returns entries."""
    child_id = await _create_child(async_client)
    await _give_d3(async_client, child_id, "2026-04-18")
    await _give_d3(async_client, child_id, "2026-04-19")

    resp = await async_client.get(f"/api/v1/vitamind3/?child_id={child_id}")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 2


@pytest.mark.anyio
async def test_list_filter_by_month(async_client):
    """GET with month filter returns only matching entries."""
    child_id = await _create_child(async_client)
    await _give_d3(async_client, child_id, "2026-03-15")
    await _give_d3(async_client, child_id, "2026-04-19")

    resp = await async_client.get(
        f"/api/v1/vitamind3/?child_id={child_id}&month=2026-04"
    )
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["date"] == "2026-04-19"


@pytest.mark.anyio
async def test_delete_vitamind3(async_client):
    """DELETE /api/v1/vitamind3/{id} removes entry."""
    child_id = await _create_child(async_client)
    data = await _give_d3(async_client, child_id)

    resp = await async_client.delete(f"/api/v1/vitamind3/{data['id']}")
    assert resp.status_code == 204

    # Confirm deleted
    resp = await async_client.get(f"/api/v1/vitamind3/?child_id={child_id}")
    assert len(resp.json()) == 0


@pytest.mark.anyio
async def test_delete_nonexistent_returns_404(async_client):
    """DELETE nonexistent entry returns 404."""
    resp = await async_client.delete("/api/v1/vitamind3/99999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_invalid_date_format(async_client):
    """POST with invalid date format returns 422."""
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/vitamind3/",
        json={"child_id": child_id, "date": "19.04.2026"},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_utc_timestamp_format(async_client):
    """Response timestamps end with Z (UTC)."""
    child_id = await _create_child(async_client)
    data = await _give_d3(async_client, child_id)
    assert data["given_at"].endswith("Z")
    assert data["created_at"].endswith("Z")
