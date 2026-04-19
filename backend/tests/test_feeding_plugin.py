"""Tests for the Feeding plugin — CRUD, filters, validation."""

import pytest
from datetime import date, datetime, timezone

# Import model so Base.metadata.create_all picks up the table
import app.plugins.feeding.models  # noqa: F401


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
async def sample_child(async_session):
    """Create a test child and return its ID."""
    from app.models.child import Child

    child = Child(name="TestBaby", birth_date=date(2025, 1, 1))
    async_session.add(child)
    await async_session.commit()
    await async_session.refresh(child)
    return child


def _feeding_payload(child_id: int, **overrides) -> dict:
    """Build a valid feeding create payload with optional overrides."""
    payload = {
        "child_id": child_id,
        "start_time": "2026-04-19T10:00:00Z",
        "feeding_type": "bottle",
        "amount_ml": 120.0,
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# CRUD Tests
# ---------------------------------------------------------------------------

class TestFeedingCRUD:
    """Full CRUD lifecycle tests."""

    @pytest.mark.anyio
    async def test_create_feeding(self, async_client, sample_child):
        """POST /api/v1/feeding/ creates entry and returns 201."""
        payload = _feeding_payload(sample_child.id)
        resp = await async_client.post("/api/v1/feeding/", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["child_id"] == sample_child.id
        assert data["feeding_type"] == "bottle"
        assert data["amount_ml"] == 120.0
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.anyio
    async def test_get_feeding(self, async_client, sample_child):
        """GET /api/v1/feeding/{id} returns the created entry."""
        payload = _feeding_payload(sample_child.id)
        create_resp = await async_client.post("/api/v1/feeding/", json=payload)
        entry_id = create_resp.json()["id"]

        resp = await async_client.get(f"/api/v1/feeding/{entry_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == entry_id

    @pytest.mark.anyio
    async def test_get_feeding_not_found(self, async_client):
        """GET /api/v1/feeding/9999 returns 404."""
        resp = await async_client.get("/api/v1/feeding/9999")
        assert resp.status_code == 404

    @pytest.mark.anyio
    async def test_list_feedings(self, async_client, sample_child):
        """GET /api/v1/feeding/ returns all entries."""
        for i in range(3):
            payload = _feeding_payload(
                sample_child.id,
                start_time=f"2026-04-19T{10 + i}:00:00Z",
            )
            await async_client.post("/api/v1/feeding/", json=payload)

        resp = await async_client.get("/api/v1/feeding/")
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    @pytest.mark.anyio
    async def test_update_feeding(self, async_client, sample_child):
        """PATCH /api/v1/feeding/{id} updates fields."""
        payload = _feeding_payload(sample_child.id)
        create_resp = await async_client.post("/api/v1/feeding/", json=payload)
        entry_id = create_resp.json()["id"]

        update_resp = await async_client.patch(
            f"/api/v1/feeding/{entry_id}",
            json={"amount_ml": 200.0, "notes": "Extra hungry"},
        )
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["amount_ml"] == 200.0
        assert data["notes"] == "Extra hungry"

    @pytest.mark.anyio
    async def test_update_feeding_not_found(self, async_client):
        """PATCH /api/v1/feeding/9999 returns 404."""
        resp = await async_client.patch(
            "/api/v1/feeding/9999", json={"notes": "nope"}
        )
        assert resp.status_code == 404

    @pytest.mark.anyio
    async def test_delete_feeding(self, async_client, sample_child):
        """DELETE /api/v1/feeding/{id} returns 204 and entry is gone."""
        payload = _feeding_payload(sample_child.id)
        create_resp = await async_client.post("/api/v1/feeding/", json=payload)
        entry_id = create_resp.json()["id"]

        del_resp = await async_client.delete(f"/api/v1/feeding/{entry_id}")
        assert del_resp.status_code == 204

        get_resp = await async_client.get(f"/api/v1/feeding/{entry_id}")
        assert get_resp.status_code == 404

    @pytest.mark.anyio
    async def test_delete_feeding_not_found(self, async_client):
        """DELETE /api/v1/feeding/9999 returns 404."""
        resp = await async_client.delete("/api/v1/feeding/9999")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Filter Tests
# ---------------------------------------------------------------------------

class TestFeedingFilters:
    """Test query parameter filters on the list endpoint."""

    @pytest.mark.anyio
    async def test_filter_by_child_id(self, async_client, sample_child, async_session):
        """Filter by child_id returns only matching entries."""
        from app.models.child import Child

        other = Child(name="OtherBaby", birth_date=date(2025, 6, 1))
        async_session.add(other)
        await async_session.commit()
        await async_session.refresh(other)

        await async_client.post(
            "/api/v1/feeding/", json=_feeding_payload(sample_child.id)
        )
        await async_client.post(
            "/api/v1/feeding/", json=_feeding_payload(other.id)
        )

        resp = await async_client.get(
            f"/api/v1/feeding/?child_id={sample_child.id}"
        )
        assert resp.status_code == 200
        entries = resp.json()
        assert len(entries) == 1
        assert entries[0]["child_id"] == sample_child.id

    @pytest.mark.anyio
    async def test_filter_by_feeding_type(self, async_client, sample_child):
        """Filter by feeding_type returns only matching entries."""
        await async_client.post(
            "/api/v1/feeding/",
            json=_feeding_payload(sample_child.id, feeding_type="bottle"),
        )
        await async_client.post(
            "/api/v1/feeding/",
            json=_feeding_payload(
                sample_child.id,
                feeding_type="breast_left",
                start_time="2026-04-19T11:00:00Z",
            ),
        )

        resp = await async_client.get("/api/v1/feeding/?feeding_type=breast_left")
        assert resp.status_code == 200
        entries = resp.json()
        assert len(entries) == 1
        assert entries[0]["feeding_type"] == "breast_left"

    @pytest.mark.anyio
    async def test_filter_by_date_range(self, async_client, sample_child):
        """Filter by date_from and date_to."""
        await async_client.post(
            "/api/v1/feeding/",
            json=_feeding_payload(
                sample_child.id, start_time="2026-04-18T08:00:00Z"
            ),
        )
        await async_client.post(
            "/api/v1/feeding/",
            json=_feeding_payload(
                sample_child.id, start_time="2026-04-19T12:00:00Z"
            ),
        )

        resp = await async_client.get(
            "/api/v1/feeding/?date_from=2026-04-19T00:00:00Z&date_to=2026-04-19T23:59:59Z"
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1


# ---------------------------------------------------------------------------
# Validation Tests (K3)
# ---------------------------------------------------------------------------

class TestFeedingValidation:
    """Test Pydantic field constraints (Security K3)."""

    @pytest.mark.anyio
    async def test_amount_ml_negative_rejected(self, async_client, sample_child):
        """amount_ml < 0 is rejected."""
        payload = _feeding_payload(sample_child.id, amount_ml=-1)
        resp = await async_client.post("/api/v1/feeding/", json=payload)
        assert resp.status_code == 422

    @pytest.mark.anyio
    async def test_amount_ml_over_1000_rejected(self, async_client, sample_child):
        """amount_ml > 1000 is rejected."""
        payload = _feeding_payload(sample_child.id, amount_ml=1001)
        resp = await async_client.post("/api/v1/feeding/", json=payload)
        assert resp.status_code == 422

    @pytest.mark.anyio
    async def test_amount_ml_boundary_accepted(self, async_client, sample_child):
        """amount_ml=0 and amount_ml=1000 are accepted."""
        for val in [0, 1000]:
            payload = _feeding_payload(
                sample_child.id,
                amount_ml=val,
                start_time=f"2026-04-19T{10 + val % 10}:00:00Z",
            )
            resp = await async_client.post("/api/v1/feeding/", json=payload)
            assert resp.status_code == 201, f"amount_ml={val} should be accepted"

    @pytest.mark.anyio
    async def test_notes_max_length(self, async_client, sample_child):
        """notes longer than 2000 chars is rejected."""
        payload = _feeding_payload(sample_child.id, notes="x" * 2001)
        resp = await async_client.post("/api/v1/feeding/", json=payload)
        assert resp.status_code == 422

    @pytest.mark.anyio
    async def test_food_type_max_length(self, async_client, sample_child):
        """food_type longer than 100 chars is rejected."""
        payload = _feeding_payload(
            sample_child.id,
            feeding_type="solid",
            food_type="x" * 101,
        )
        resp = await async_client.post("/api/v1/feeding/", json=payload)
        assert resp.status_code == 422

    @pytest.mark.anyio
    async def test_invalid_feeding_type_rejected(self, async_client, sample_child):
        """Invalid feeding_type is rejected."""
        payload = _feeding_payload(sample_child.id, feeding_type="invalid")
        resp = await async_client.post("/api/v1/feeding/", json=payload)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Feeding Type Variety
# ---------------------------------------------------------------------------

class TestFeedingTypes:
    """Test all valid feeding_type values."""

    @pytest.mark.anyio
    @pytest.mark.parametrize(
        "ftype",
        ["breast_left", "breast_right", "bottle", "solid"],
    )
    async def test_all_feeding_types_accepted(
        self, async_client, sample_child, ftype
    ):
        """Each valid feeding_type creates successfully."""
        payload = _feeding_payload(sample_child.id, feeding_type=ftype)
        resp = await async_client.post("/api/v1/feeding/", json=payload)
        assert resp.status_code == 201
        assert resp.json()["feeding_type"] == ftype

    @pytest.mark.anyio
    async def test_solid_with_food_type(self, async_client, sample_child):
        """Solid feeding can include food_type description."""
        payload = _feeding_payload(
            sample_child.id,
            feeding_type="solid",
            food_type="Karotte",
            amount_ml=None,
        )
        resp = await async_client.post("/api/v1/feeding/", json=payload)
        assert resp.status_code == 201
        assert resp.json()["food_type"] == "Karotte"

    @pytest.mark.anyio
    async def test_breast_with_duration(self, async_client, sample_child):
        """Breastfeeding can include duration_minutes."""
        payload = _feeding_payload(
            sample_child.id,
            feeding_type="breast_left",
            duration_minutes=15,
            amount_ml=None,
        )
        resp = await async_client.post("/api/v1/feeding/", json=payload)
        assert resp.status_code == 201
        assert resp.json()["duration_minutes"] == 15
