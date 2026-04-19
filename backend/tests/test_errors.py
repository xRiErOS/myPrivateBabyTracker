"""Test custom error handlers — 404, validation, catch-all."""

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_not_found_returns_404_json(async_client: AsyncClient):
    """GET non-existent child returns structured 404."""
    response = await async_client.get("/api/v1/children/99999")
    assert response.status_code == 404
    data = response.json()
    assert data["error_code"] == "NOT_FOUND"
    assert "detail" in data


@pytest.mark.anyio
async def test_validation_error_on_invalid_child(async_client: AsyncClient):
    """POST child with missing required fields returns 422."""
    response = await async_client.post("/api/v1/children/", json={})
    assert response.status_code == 422


@pytest.mark.anyio
async def test_validation_error_name_too_long(async_client: AsyncClient):
    """POST child with name exceeding max_length returns 422 (K3)."""
    response = await async_client.post(
        "/api/v1/children/",
        json={"name": "x" * 101, "birth_date": "2025-01-01"},
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_validation_error_notes_too_long(async_client: AsyncClient):
    """POST child with notes exceeding max_length returns 422 (K3)."""
    response = await async_client.post(
        "/api/v1/children/",
        json={"name": "Test", "birth_date": "2025-01-01", "notes": "x" * 2001},
    )
    assert response.status_code == 422
