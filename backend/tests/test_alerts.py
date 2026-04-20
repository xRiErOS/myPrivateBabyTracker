"""Tests for the Alert system — config CRUD + warning evaluation."""

import pytest
from httpx import AsyncClient


async def _create_child(async_client: AsyncClient, name: str = "TestBaby") -> int:
    resp = await async_client.post(
        "/api/v1/children/",
        json={"name": name, "birth_date": "2025-01-01"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# Config Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_get_default_config(async_client):
    """GET /api/v1/alerts/config creates defaults if none exists."""
    child_id = await _create_child(async_client)
    resp = await async_client.get(f"/api/v1/alerts/config?child_id={child_id}")
    assert resp.status_code == 200
    config = resp.json()
    assert config["child_id"] == child_id
    assert config["wet_diaper_enabled"] is False
    assert config["wet_diaper_min"] == 5
    assert config["no_stool_enabled"] is False
    assert config["no_stool_hours"] == 48
    assert config["low_feeding_enabled"] is False
    assert config["fever_enabled"] is False


@pytest.mark.anyio
async def test_update_config(async_client):
    """PATCH /api/v1/alerts/config updates thresholds."""
    child_id = await _create_child(async_client)
    # Create default first
    await async_client.get(f"/api/v1/alerts/config?child_id={child_id}")

    resp = await async_client.patch(
        f"/api/v1/alerts/config?child_id={child_id}",
        json={"wet_diaper_enabled": True, "wet_diaper_min": 6},
    )
    assert resp.status_code == 200
    assert resp.json()["wet_diaper_enabled"] is True
    assert resp.json()["wet_diaper_min"] == 6


@pytest.mark.anyio
async def test_update_config_validation(async_client):
    """PATCH /api/v1/alerts/config validates ranges."""
    child_id = await _create_child(async_client)
    resp = await async_client.patch(
        f"/api/v1/alerts/config?child_id={child_id}",
        json={"wet_diaper_min": 0},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Alert Evaluation Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_no_alerts_when_disabled(async_client):
    """No alerts returned when all thresholds are disabled (default)."""
    child_id = await _create_child(async_client)
    resp = await async_client.get(f"/api/v1/alerts/?child_id={child_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["child_id"] == child_id
    assert data["alerts"] == []


@pytest.mark.anyio
async def test_wet_diaper_alert(async_client):
    """Alert fires when wet diapers < threshold."""
    child_id = await _create_child(async_client)

    # Enable wet diaper alert
    await async_client.patch(
        f"/api/v1/alerts/config?child_id={child_id}",
        json={"wet_diaper_enabled": True, "wet_diaper_min": 5},
    )

    # Create only 2 wet diapers in last 24h
    for i in range(2):
        await async_client.post("/api/v1/diaper/", json={
            "child_id": child_id,
            "time": f"2026-04-20T{8+i:02d}:00:00Z",
            "diaper_type": "wet",
        })

    resp = await async_client.get(f"/api/v1/alerts/?child_id={child_id}")
    alerts = resp.json()["alerts"]
    assert len(alerts) >= 1
    wet_alert = next((a for a in alerts if a["type"] == "wet_diaper"), None)
    assert wet_alert is not None
    assert wet_alert["severity"] == "critical"  # <= 2 is critical


@pytest.mark.anyio
async def test_no_wet_diaper_alert_when_sufficient(async_client):
    """No alert when wet diapers >= threshold."""
    child_id = await _create_child(async_client)

    await async_client.patch(
        f"/api/v1/alerts/config?child_id={child_id}",
        json={"wet_diaper_enabled": True, "wet_diaper_min": 3},
    )

    for i in range(4):
        await async_client.post("/api/v1/diaper/", json={
            "child_id": child_id,
            "time": f"2026-04-20T{8+i:02d}:00:00Z",
            "diaper_type": "wet",
        })

    resp = await async_client.get(f"/api/v1/alerts/?child_id={child_id}")
    alerts = resp.json()["alerts"]
    wet_alerts = [a for a in alerts if a["type"] == "wet_diaper"]
    assert len(wet_alerts) == 0


@pytest.mark.anyio
async def test_fever_alert(async_client):
    """Alert fires when latest temperature >= threshold."""
    child_id = await _create_child(async_client)

    await async_client.patch(
        f"/api/v1/alerts/config?child_id={child_id}",
        json={"fever_enabled": True, "fever_threshold": 38.0},
    )

    await async_client.post("/api/v1/temperature/", json={
        "child_id": child_id,
        "measured_at": "2026-04-20T08:00:00Z",
        "temperature_celsius": 38.5,
    })

    resp = await async_client.get(f"/api/v1/alerts/?child_id={child_id}")
    alerts = resp.json()["alerts"]
    fever_alert = next((a for a in alerts if a["type"] == "fever"), None)
    assert fever_alert is not None
    assert fever_alert["severity"] == "warning"  # 38.5 < 39.0


@pytest.mark.anyio
async def test_fever_critical(async_client):
    """Fever alert is critical at >= 39.0."""
    child_id = await _create_child(async_client)

    await async_client.patch(
        f"/api/v1/alerts/config?child_id={child_id}",
        json={"fever_enabled": True, "fever_threshold": 38.0},
    )

    await async_client.post("/api/v1/temperature/", json={
        "child_id": child_id,
        "measured_at": "2026-04-20T08:00:00Z",
        "temperature_celsius": 39.5,
    })

    resp = await async_client.get(f"/api/v1/alerts/?child_id={child_id}")
    alerts = resp.json()["alerts"]
    fever_alert = next((a for a in alerts if a["type"] == "fever"), None)
    assert fever_alert is not None
    assert fever_alert["severity"] == "critical"


@pytest.mark.anyio
async def test_low_feeding_alert(async_client):
    """Alert fires when bottle volume < threshold."""
    child_id = await _create_child(async_client)

    await async_client.patch(
        f"/api/v1/alerts/config?child_id={child_id}",
        json={"low_feeding_enabled": True, "low_feeding_ml": 500},
    )

    # Only 100ml bottle feeding in 24h
    await async_client.post("/api/v1/feeding/", json={
        "child_id": child_id,
        "start_time": "2026-04-20T08:00:00Z",
        "feeding_type": "bottle",
        "amount_ml": 100,
    })

    resp = await async_client.get(f"/api/v1/alerts/?child_id={child_id}")
    alerts = resp.json()["alerts"]
    feed_alert = next((a for a in alerts if a["type"] == "low_feeding"), None)
    assert feed_alert is not None


@pytest.mark.anyio
async def test_plugin_discovered_alerts_route(async_client):
    """Alert endpoints are accessible."""
    resp = await async_client.get("/api/v1/alerts/?child_id=1")
    # Should not be 404 (route exists), could be 200 (empty alerts)
    assert resp.status_code == 200
