"""Tests for the Growth plugin — WHO percentile chart API."""

import pytest
from httpx import AsyncClient

from app.plugins.growth.who_data import (
    WHO_LENGTH_BOYS,
    WHO_LENGTH_GIRLS,
    WHO_WEIGHT_BOYS,
    WHO_WEIGHT_GIRLS,
    get_who_data,
    interpolate_percentile,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_child(client: AsyncClient, **kwargs) -> int:
    """Create a child and return its ID. Default gender=female (Anna)."""
    data = {
        "name": kwargs.get("name", "Test Baby"),
        "birth_date": kwargs.get("birth_date", "2025-06-01"),
    }
    if "gender" in kwargs:
        data["gender"] = kwargs["gender"]
    elif kwargs.get("with_default_gender", True):
        data["gender"] = "female"
    if "birth_weight_g" in kwargs:
        data["birth_weight_g"] = kwargs["birth_weight_g"]
    if "birth_length_cm" in kwargs:
        data["birth_length_cm"] = kwargs["birth_length_cm"]
    resp = await client.post("/api/v1/children/", json=data)
    assert resp.status_code == 201, resp.text
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

    def test_get_who_data_male_weight(self):
        data = get_who_data("male", "weight")
        assert data is WHO_WEIGHT_BOYS

    def test_get_who_data_female_weight(self):
        data = get_who_data("female", "weight")
        assert data is WHO_WEIGHT_GIRLS

    def test_get_who_data_male_length(self):
        data = get_who_data("male", "length")
        assert data is WHO_LENGTH_BOYS

    def test_get_who_data_female_length(self):
        data = get_who_data("female", "length")
        assert data is WHO_LENGTH_GIRLS

    def test_get_who_data_none_returns_none(self):
        """MBT-205 #4: null gender returns None — no silent boys-fallback."""
        assert get_who_data(None) is None

    def test_get_who_data_other_returns_none(self):
        """MBT-205 #4: 'other' / unknown gender returns None."""
        assert get_who_data("other") is None
        assert get_who_data("") is None

    def test_interpolate_at_known_point(self):
        result = interpolate_percentile(WHO_WEIGHT_BOYS, 0.0)
        assert result == (2.5, 2.9, 3.3, 3.9, 4.2)

    def test_interpolate_between_points(self):
        result = interpolate_percentile(WHO_WEIGHT_BOYS, 0.5)
        assert 3.3 <= result[2] <= 3.5

    def test_interpolate_beyond_max(self):
        result = interpolate_percentile(WHO_WEIGHT_BOYS, 200.0)
        assert result == (10.5, 11.7, 13.1, 14.6, 15.8)

    def test_interpolate_before_min(self):
        result = interpolate_percentile(WHO_WEIGHT_BOYS, -1.0)
        assert result == (2.5, 2.9, 3.3, 3.9, 4.2)


class TestWhoDataPlausibility:
    """MBT-205 #1: Plausibility checks against WHO standard properties."""

    @pytest.mark.parametrize(
        "table",
        [WHO_WEIGHT_BOYS, WHO_WEIGHT_GIRLS, WHO_LENGTH_BOYS, WHO_LENGTH_GIRLS],
    )
    def test_percentiles_are_strictly_increasing(self, table):
        """At any given week, P3 < P15 < P50 < P85 < P97."""
        for entry in table:
            week, p3, p15, p50, p85, p97 = entry
            assert p3 < p15 < p50 < p85 < p97, f"week={week}: {entry}"

    @pytest.mark.parametrize(
        "table",
        [WHO_WEIGHT_BOYS, WHO_WEIGHT_GIRLS, WHO_LENGTH_BOYS, WHO_LENGTH_GIRLS],
    )
    def test_p50_monotonically_increasing(self, table):
        """P50 grows with age (no shrinking babies)."""
        prev_p50 = -1.0
        for entry in table:
            week, _p3, _p15, p50, _p85, _p97 = entry
            # Allow tiny dips < 0.5% for week-to-week noise
            assert p50 >= prev_p50 - 0.5, f"week={week}: p50={p50} < prev={prev_p50}"
            prev_p50 = p50

    def test_who_p50_birth_weight_male_within_2pct_of_official(self):
        """MBT-205 #1: WHO P50 at birth (boys) = 3.346 kg per official data."""
        official = 3.346
        actual = WHO_WEIGHT_BOYS[0][3]
        deviation_pct = abs(actual - official) / official * 100
        assert deviation_pct < 2.0, f"P50 boys week 0 deviation {deviation_pct:.2f}% > 2%"

    def test_who_p50_birth_weight_female_within_2pct_of_official(self):
        """MBT-205 #1: WHO P50 at birth (girls) = 3.232 kg per official data."""
        official = 3.232
        actual = WHO_WEIGHT_GIRLS[0][3]
        deviation_pct = abs(actual - official) / official * 100
        assert deviation_pct < 2.0, f"P50 girls week 0 deviation {deviation_pct:.2f}% > 2%"


# ---------------------------------------------------------------------------
# API Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_growth_chart_weight_metric(async_client):
    """GET .../growth/chart/{id}?metric=weight returns weight curves + measurements."""
    child_id = await _create_child(async_client, gender="female")
    await _create_weight(async_client, child_id, "2025-06-01T10:00:00Z", 3300)
    await _create_weight(async_client, child_id, "2025-07-01T10:00:00Z", 4500)

    resp = await async_client.get(f"/api/v1/growth/chart/{child_id}?metric=weight")
    assert resp.status_code == 200

    data = resp.json()
    assert data["metric"] == "weight"
    assert data["child_name"] == "Test Baby"
    assert data["is_preterm"] is False
    assert len(data["percentile_curves"]) > 0
    assert len(data["measurements"]) == 2

    m = data["measurements"][0]
    assert "age_weeks" in m
    assert "value" in m
    assert m["value"] == 3.3


@pytest.mark.anyio
async def test_growth_chart_default_metric_is_weight(async_client):
    """Without ?metric, default = weight."""
    child_id = await _create_child(async_client, gender="male")
    resp = await async_client.get(f"/api/v1/growth/chart/{child_id}")
    assert resp.status_code == 200
    assert resp.json()["metric"] == "weight"


@pytest.mark.anyio
async def test_growth_chart_length_metric(async_client):
    """MBT-205 #5: ?metric=length returns length curves."""
    child_id = await _create_child(
        async_client, gender="female", birth_length_cm="49.50"
    )
    resp = await async_client.get(f"/api/v1/growth/chart/{child_id}?metric=length")
    assert resp.status_code == 200

    data = resp.json()
    assert data["metric"] == "length"
    # Length P50 girls at week 0 ≈ 49.1 cm — sanity check
    p50_at_birth = data["percentile_curves"][0]["p50"]
    assert 47 < p50_at_birth < 51

    # P0 datapoint from birth_length_cm (MBT-205 #6)
    assert len(data["measurements"]) == 1
    assert data["measurements"][0]["age_weeks"] == 0.0
    assert data["measurements"][0]["value"] == 49.5


@pytest.mark.anyio
async def test_growth_chart_p0_birth_weight(async_client):
    """MBT-205 #6: birth_weight_g shows up as P0 datapoint."""
    child_id = await _create_child(
        async_client, gender="male", birth_weight_g=3450
    )
    resp = await async_client.get(f"/api/v1/growth/chart/{child_id}")
    assert resp.status_code == 200

    data = resp.json()
    assert len(data["measurements"]) == 1
    assert data["measurements"][0]["age_weeks"] == 0.0
    assert data["measurements"][0]["value"] == 3.45


@pytest.mark.anyio
async def test_growth_chart_returns_400_when_gender_missing(async_client):
    """MBT-205 #4: Backend rejects gender=null with 400 — kein stiller Boys-Default."""
    resp = await async_client.post(
        "/api/v1/children/",
        json={"name": "NoGender", "birth_date": "2025-06-01"},
    )
    assert resp.status_code == 201
    child_id = resp.json()["id"]

    resp = await async_client.get(f"/api/v1/growth/chart/{child_id}")
    assert resp.status_code == 400
    assert "gender" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_growth_chart_returns_400_for_other_gender(async_client):
    """MBT-205 #4: gender='other' liefert 400 — keine WHO-Kurve verfügbar."""
    child_id = await _create_child(async_client, gender="other")
    resp = await async_client.get(f"/api/v1/growth/chart/{child_id}")
    assert resp.status_code == 400


@pytest.mark.anyio
async def test_growth_chart_not_found(async_client):
    resp = await async_client.get("/api/v1/growth/chart/999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_growth_chart_empty_measurements(async_client):
    """No weight + no birth_weight_g → empty measurements, but curves present."""
    child_id = await _create_child(async_client, gender="male")
    resp = await async_client.get(f"/api/v1/growth/chart/{child_id}")
    assert resp.status_code == 200

    data = resp.json()
    assert len(data["measurements"]) == 0
    assert len(data["percentile_curves"]) > 0


@pytest.mark.anyio
async def test_growth_chart_plugin_discovery(async_client):
    """Growth plugin is discovered and app loads successfully."""
    resp = await async_client.get("/api/v1/health")
    assert resp.status_code == 200
