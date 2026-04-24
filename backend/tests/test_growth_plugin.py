"""Tests for the Growth plugin — WHO percentile chart API."""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from app.models.child import Child
from app.plugins.growth.who_data import get_who_data, interpolate_percentile


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_child(client: AsyncClient, **kwargs) -> int:
    """Create a child and return its ID."""
    data = {
        "name": kwargs.get("name", "Test Baby"),
        "birth_date": kwargs.get("birth_date", "2025-06-01"),
    }
    resp = await client.post("/api/v1/children/", json=data)
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_weight(client: AsyncClient, child_id: int, measured_at: str, grams: int):
    """Create a weight entry."""
    data = {
        "child_id": child_id,
        "measured_at": measured_at,
        "weight_grams": grams,
    }
    resp = await client.post("/api/v1/weight/", json=data)
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# WHO Data Unit Tests
# ---------------------------------------------------------------------------

class TestWhoData:
    """Test WHO data access and interpolation."""

    def test_get_who_data_male(self):
        """Male data returns boys dataset."""
        data = get_who_data("male")
        assert len(data) > 0
        # First entry should be week 0
        assert data[0][0] == 0

    def test_get_who_data_female(self):
        """Female data returns girls dataset."""
        data = get_who_data("female")
        assert len(data) > 0
        # Girls P50 at birth should be ~3.2
        assert data[0][3] == 3.2

    def test_get_who_data_default(self):
        """Unknown gender defaults to boys."""
        data = get_who_data(None)
        assert data[0][3] == 3.3  # Boys P50 at birth

    def test_interpolate_at_known_point(self):
        """Interpolation at a known week returns exact values."""
        data = get_who_data("male")
        result = interpolate_percentile(data, 0.0)
        assert result == (2.5, 2.9, 3.3, 3.9, 4.2)

    def test_interpolate_between_points(self):
        """Interpolation between weeks returns reasonable values."""
        data = get_who_data("male")
        result = interpolate_percentile(data, 0.5)
        # P50 should be between 3.3 and 3.5
        assert 3.3 <= result[2] <= 3.5

    def test_interpolate_beyond_max(self):
        """Interpolation beyond max week returns last values."""
        data = get_who_data("male")
        result = interpolate_percentile(data, 200.0)
        assert result == (10.5, 11.7, 13.1, 14.6, 15.8)

    def test_interpolate_before_min(self):
        """Interpolation before week 0 returns first values."""
        data = get_who_data("male")
        result = interpolate_percentile(data, -1.0)
        assert result == (2.5, 2.9, 3.3, 3.9, 4.2)


# ---------------------------------------------------------------------------
# API Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_growth_chart_basic(async_client):
    """GET /api/v1/growth/chart/{id} returns chart with percentiles and measurements."""
    child_id = await _create_child(async_client)
    await _create_weight(async_client, child_id, "2025-06-01T10:00:00Z", 3300)
    await _create_weight(async_client, child_id, "2025-07-01T10:00:00Z", 4500)

    resp = await async_client.get(f"/api/v1/growth/chart/{child_id}")
    assert resp.status_code == 200

    data = resp.json()
    assert data["child_name"] == "Test Baby"
    assert data["is_preterm"] is False
    assert data["corrected_age_offset_weeks"] == 0.0
    assert len(data["percentile_curves"]) > 0
    assert len(data["measurements"]) == 2

    # Check percentile curve structure
    curve = data["percentile_curves"][0]
    assert "p3" in curve
    assert "p50" in curve
    assert "p97" in curve

    # Check measurements have age_weeks
    m = data["measurements"][0]
    assert "age_weeks" in m
    assert "weight_kg" in m
    assert m["weight_kg"] == 3.3


@pytest.mark.anyio
async def test_growth_chart_not_found(async_client):
    """GET /api/v1/growth/chart/999 returns 404."""
    resp = await async_client.get("/api/v1/growth/chart/999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_growth_chart_empty(async_client):
    """GET /api/v1/growth/chart/{id} returns empty measurements if no weights."""
    child_id = await _create_child(async_client)

    resp = await async_client.get(f"/api/v1/growth/chart/{child_id}")
    assert resp.status_code == 200

    data = resp.json()
    assert len(data["measurements"]) == 0
    assert len(data["percentile_curves"]) > 0


@pytest.mark.anyio
async def test_growth_chart_plugin_discovery(async_client):
    """Growth plugin is discovered and routes are registered."""
    resp = await async_client.get("/api/v1/health")
    # Just verify the app loaded successfully
    assert resp.status_code == 200
