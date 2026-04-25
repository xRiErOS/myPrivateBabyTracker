"""Tests for the Sleep plugin — CRUD, filters, validation, duration, discovery."""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient

from app.models.child import Child
from app.plugins.sleep.schemas import SleepCreate


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_child(async_client: AsyncClient, name: str = "TestBaby") -> int:
    """Create a child and return its ID."""
    resp = await async_client.post(
        "/api/v1/children/",
        json={"name": name, "birth_date": "2025-01-01"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_sleep(
    async_client: AsyncClient,
    child_id: int,
    start: str = "2026-04-19T20:00:00Z",
    end: str | None = "2026-04-19T21:30:00Z",
    sleep_type: str = "nap",
    **kwargs,
) -> dict:
    """Create a sleep entry and return the response JSON."""
    payload = {
        "child_id": child_id,
        "start_time": start,
        "sleep_type": sleep_type,
        **kwargs,
    }
    if end is not None:
        payload["end_time"] = end
    resp = await async_client.post("/api/v1/sleep/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# CRUD Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_sleep_entry(async_client):
    """POST /api/v1/sleep/ creates an entry and returns 201."""
    child_id = await _create_child(async_client)
    data = await _create_sleep(async_client, child_id)

    assert data["id"] is not None
    assert data["child_id"] == child_id
    assert data["sleep_type"] == "nap"


@pytest.mark.anyio
async def test_list_sleep_entries(async_client):
    """GET /api/v1/sleep/ returns all entries."""
    child_id = await _create_child(async_client)
    await _create_sleep(async_client, child_id)
    await _create_sleep(async_client, child_id, start="2026-04-19T22:00:00Z", end="2026-04-20T06:00:00Z", sleep_type="night")

    resp = await async_client.get("/api/v1/sleep/")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 2


@pytest.mark.anyio
async def test_get_sleep_entry(async_client):
    """GET /api/v1/sleep/{id} returns a single entry."""
    child_id = await _create_child(async_client)
    created = await _create_sleep(async_client, child_id)

    resp = await async_client.get(f"/api/v1/sleep/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


@pytest.mark.anyio
async def test_get_sleep_entry_not_found(async_client):
    """GET /api/v1/sleep/{id} returns 404 for non-existent entry."""
    resp = await async_client.get("/api/v1/sleep/9999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_sleep_entry(async_client):
    """PATCH /api/v1/sleep/{id} updates fields."""
    child_id = await _create_child(async_client)
    created = await _create_sleep(async_client, child_id)

    resp = await async_client.patch(
        f"/api/v1/sleep/{created['id']}",
        json={"quality": 4, "notes": "Schlief gut"},
    )
    assert resp.status_code == 200
    assert resp.json()["quality"] == 4
    assert resp.json()["notes"] == "Schlief gut"


@pytest.mark.anyio
async def test_update_sleep_entry_not_found(async_client):
    """PATCH /api/v1/sleep/{id} returns 404 for non-existent entry."""
    resp = await async_client.patch("/api/v1/sleep/9999", json={"quality": 3})
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_sleep_entry(async_client):
    """DELETE /api/v1/sleep/{id} removes the entry."""
    child_id = await _create_child(async_client)
    created = await _create_sleep(async_client, child_id)

    resp = await async_client.delete(f"/api/v1/sleep/{created['id']}")
    assert resp.status_code == 204

    # Verify it's gone
    resp = await async_client.get(f"/api/v1/sleep/{created['id']}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_sleep_entry_not_found(async_client):
    """DELETE /api/v1/sleep/{id} returns 404 for non-existent entry."""
    resp = await async_client.delete("/api/v1/sleep/9999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Filter Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_filter_by_child_id(async_client):
    """GET /api/v1/sleep/?child_id= filters correctly."""
    child1 = await _create_child(async_client, "Baby1")
    child2 = await _create_child(async_client, "Baby2")
    await _create_sleep(async_client, child1)
    await _create_sleep(async_client, child2)

    resp = await async_client.get(f"/api/v1/sleep/?child_id={child1}")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["child_id"] == child1


@pytest.mark.anyio
async def test_filter_by_sleep_type(async_client):
    """GET /api/v1/sleep/?sleep_type= filters correctly."""
    child_id = await _create_child(async_client)
    await _create_sleep(async_client, child_id, sleep_type="nap")
    await _create_sleep(async_client, child_id, start="2026-04-19T22:00:00Z", end="2026-04-20T06:00:00Z", sleep_type="night")

    resp = await async_client.get("/api/v1/sleep/?sleep_type=night")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["sleep_type"] == "night"


@pytest.mark.anyio
async def test_filter_by_date_range(async_client):
    """GET /api/v1/sleep/?date_from=&date_to= filters correctly."""
    child_id = await _create_child(async_client)
    await _create_sleep(async_client, child_id, start="2026-04-18T20:00:00Z", end="2026-04-18T21:00:00Z")
    await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end="2026-04-19T21:00:00Z")

    resp = await async_client.get(
        "/api/v1/sleep/?date_from=2026-04-19T00:00:00Z&date_to=2026-04-19T23:59:59Z"
    )
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1


# ---------------------------------------------------------------------------
# Validation Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_quality_out_of_range(async_client):
    """Quality must be 1-5."""
    child_id = await _create_child(async_client)

    # Too high
    resp = await async_client.post(
        "/api/v1/sleep/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-19T20:00:00Z",
            "sleep_type": "nap",
            "quality": 6,
        },
    )
    assert resp.status_code == 422

    # Too low
    resp = await async_client.post(
        "/api/v1/sleep/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-19T20:00:00Z",
            "sleep_type": "nap",
            "quality": 0,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_notes_max_length(async_client):
    """Notes must not exceed 2000 characters."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/sleep/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-19T20:00:00Z",
            "sleep_type": "nap",
            "notes": "x" * 2001,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_invalid_sleep_type(async_client):
    """Invalid sleep_type must be rejected."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/sleep/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-19T20:00:00Z",
            "sleep_type": "siesta",
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_end_time_before_start_time(async_client):
    """end_time must be after start_time."""
    child_id = await _create_child(async_client)

    resp = await async_client.post(
        "/api/v1/sleep/",
        json={
            "child_id": child_id,
            "start_time": "2026-04-19T21:00:00Z",
            "end_time": "2026-04-19T20:00:00Z",
            "sleep_type": "nap",
        },
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Duration Calculation Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_duration_calculated(async_client):
    """Duration is computed from start and end times."""
    child_id = await _create_child(async_client)
    data = await _create_sleep(
        async_client,
        child_id,
        start="2026-04-19T20:00:00Z",
        end="2026-04-19T21:30:00Z",
    )
    assert data["duration_minutes"] == 90


@pytest.mark.anyio
async def test_duration_null_when_ongoing(async_client):
    """Duration is null when end_time is not set (ongoing sleep)."""
    child_id = await _create_child(async_client)
    data = await _create_sleep(
        async_client,
        child_id,
        start="2026-04-19T20:00:00Z",
        end=None,
    )
    assert data["duration_minutes"] is None
    assert data["end_time"] is None


@pytest.mark.anyio
async def test_duration_recalculated_on_update(async_client):
    """Duration is recomputed when end_time is updated."""
    child_id = await _create_child(async_client)
    created = await _create_sleep(async_client, child_id, end=None)
    assert created["duration_minutes"] is None

    resp = await async_client.patch(
        f"/api/v1/sleep/{created['id']}",
        json={"end_time": "2026-04-19T22:00:00Z"},
    )
    assert resp.status_code == 200
    assert resp.json()["duration_minutes"] == 120


# ---------------------------------------------------------------------------
# Overlap Validation Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_overlap_create_rejected(async_client):
    """POST rejects a new entry that overlaps an existing one."""
    child_id = await _create_child(async_client)
    await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end="2026-04-19T22:00:00Z")

    # New entry fully inside existing
    resp = await async_client.post("/api/v1/sleep/", json={
        "child_id": child_id,
        "start_time": "2026-04-19T20:30:00Z",
        "end_time": "2026-04-19T21:00:00Z",
        "sleep_type": "nap",
    })
    assert resp.status_code == 422
    assert "Ueberlappender" in resp.json()["detail"]


@pytest.mark.anyio
async def test_overlap_partial_before(async_client):
    """POST rejects entry that starts before and ends during existing."""
    child_id = await _create_child(async_client)
    await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end="2026-04-19T22:00:00Z")

    resp = await async_client.post("/api/v1/sleep/", json={
        "child_id": child_id,
        "start_time": "2026-04-19T19:00:00Z",
        "end_time": "2026-04-19T20:30:00Z",
        "sleep_type": "nap",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_overlap_partial_after(async_client):
    """POST rejects entry that starts during and ends after existing."""
    child_id = await _create_child(async_client)
    await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end="2026-04-19T22:00:00Z")

    resp = await async_client.post("/api/v1/sleep/", json={
        "child_id": child_id,
        "start_time": "2026-04-19T21:30:00Z",
        "end_time": "2026-04-19T23:00:00Z",
        "sleep_type": "nap",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_no_overlap_adjacent(async_client):
    """POST allows entry that starts exactly when existing ends."""
    child_id = await _create_child(async_client)
    await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end="2026-04-19T22:00:00Z")

    resp = await async_client.post("/api/v1/sleep/", json={
        "child_id": child_id,
        "start_time": "2026-04-19T22:00:00Z",
        "end_time": "2026-04-19T23:00:00Z",
        "sleep_type": "night",
    })
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_no_overlap_different_child(async_client):
    """POST allows overlapping entries for different children."""
    child1 = await _create_child(async_client, "Baby1")
    child2 = await _create_child(async_client, "Baby2")
    await _create_sleep(async_client, child1, start="2026-04-19T20:00:00Z", end="2026-04-19T22:00:00Z")

    resp = await async_client.post("/api/v1/sleep/", json={
        "child_id": child2,
        "start_time": "2026-04-19T20:00:00Z",
        "end_time": "2026-04-19T22:00:00Z",
        "sleep_type": "nap",
    })
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_overlap_ongoing_blocks_new(async_client):
    """POST rejects new entry when an ongoing sleep (end=null) exists."""
    child_id = await _create_child(async_client)
    await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end=None)

    resp = await async_client.post("/api/v1/sleep/", json={
        "child_id": child_id,
        "start_time": "2026-04-19T21:00:00Z",
        "end_time": "2026-04-19T22:00:00Z",
        "sleep_type": "nap",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_overlap_new_ongoing_blocked_by_existing(async_client):
    """POST rejects new ongoing entry when it overlaps existing finished entry."""
    child_id = await _create_child(async_client)
    await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end="2026-04-19T22:00:00Z")

    resp = await async_client.post("/api/v1/sleep/", json={
        "child_id": child_id,
        "start_time": "2026-04-19T21:00:00Z",
        "sleep_type": "nap",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_overlap_update_excluded_self(async_client):
    """PATCH does not flag overlap with its own entry."""
    child_id = await _create_child(async_client)
    created = await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end="2026-04-19T22:00:00Z")

    resp = await async_client.patch(
        f"/api/v1/sleep/{created['id']}",
        json={"end_time": "2026-04-19T22:30:00Z"},
    )
    assert resp.status_code == 200


@pytest.mark.anyio
async def test_overlap_update_rejected(async_client):
    """PATCH rejects update that causes overlap with another entry."""
    child_id = await _create_child(async_client)
    await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end="2026-04-19T22:00:00Z")
    second = await _create_sleep(async_client, child_id, start="2026-04-19T22:00:00Z", end="2026-04-19T23:00:00Z", sleep_type="night")

    # Extend second entry's start into first entry's range
    resp = await async_client.patch(
        f"/api/v1/sleep/{second['id']}",
        json={"start_time": "2026-04-19T21:00:00Z"},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Chart Endpoint Tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_sleep_chart_basic(async_client):
    """GET /api/v1/sleep/chart returns aggregated daily sleep data."""
    child_id = await _create_child(async_client)

    # Create entries across two days
    await _create_sleep(async_client, child_id, start="2026-04-19T14:00:00Z", end="2026-04-19T15:30:00Z", sleep_type="nap")
    await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end="2026-04-20T06:00:00Z", sleep_type="night")

    resp = await async_client.get(f"/api/v1/sleep/chart?child_id={child_id}&days=30")
    assert resp.status_code == 200
    data = resp.json()

    assert data["child_name"] == "TestBaby"
    assert data["is_preterm"] is False
    assert "target_min_hours" in data
    assert "target_max_hours" in data
    assert "age_group" in data
    assert len(data["measurements"]) == 30


@pytest.mark.anyio
async def test_sleep_chart_midnight_split(async_client):
    """Chart correctly splits sleep entries across Berlin midnight."""
    child_id = await _create_child(async_client)

    # Night sleep: 21:00 UTC = 23:00 Berlin to 00:00 UTC = 02:00 Berlin
    # Berlin split: 1h on 2026-04-19 (23:00-00:00), 2h on 2026-04-20 (00:00-02:00)
    await _create_sleep(
        async_client, child_id,
        start="2026-04-19T21:00:00Z",
        end="2026-04-20T00:00:00Z",
        sleep_type="night",
    )

    resp = await async_client.get(f"/api/v1/sleep/chart?child_id={child_id}&days=30")
    assert resp.status_code == 200
    data = resp.json()

    day_map = {m["date"]: m for m in data["measurements"]}
    assert day_map["2026-04-19"]["night_hours"] == 1.0
    assert day_map["2026-04-20"]["night_hours"] == 2.0


@pytest.mark.anyio
async def test_sleep_chart_child_not_found(async_client):
    """GET /api/v1/sleep/chart returns 404 for non-existent child."""
    resp = await async_client.get("/api/v1/sleep/chart?child_id=9999&days=30")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_sleep_chart_excludes_ongoing(async_client):
    """Chart ignores ongoing (no end_time) entries."""
    child_id = await _create_child(async_client)

    # Create an ongoing sleep entry (no end_time)
    await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end=None, sleep_type="night")

    resp = await async_client.get(f"/api/v1/sleep/chart?child_id={child_id}&days=30")
    assert resp.status_code == 200
    data = resp.json()

    # All days should show 0 hours since the ongoing entry is excluded
    for m in data["measurements"]:
        assert m["total_hours"] == 0.0


@pytest.mark.anyio
async def test_sleep_chart_nap_vs_night(async_client):
    """Chart correctly separates nap and night hours."""
    child_id = await _create_child(async_client)

    await _create_sleep(async_client, child_id, start="2026-04-19T13:00:00Z", end="2026-04-19T14:00:00Z", sleep_type="nap")
    await _create_sleep(async_client, child_id, start="2026-04-19T20:00:00Z", end="2026-04-19T22:00:00Z", sleep_type="night")

    resp = await async_client.get(f"/api/v1/sleep/chart?child_id={child_id}&days=30")
    assert resp.status_code == 200

    day_map = {m["date"]: m for m in resp.json()["measurements"]}
    if "2026-04-19" in day_map:
        assert day_map["2026-04-19"]["nap_hours"] == 1.0
        assert day_map["2026-04-19"]["night_hours"] == 2.0
        assert day_map["2026-04-19"]["total_hours"] == 3.0


# ---------------------------------------------------------------------------
# Plugin Discovery Test
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_sleep_plugin_discovered():
    """SleepPlugin is discovered by the registry."""
    from app.plugins.registry import PluginRegistry

    registry = PluginRegistry()
    discovered = registry.discover()
    names = [p.name for p in discovered]
    assert "sleep" in names


@pytest.mark.anyio
async def test_sleep_plugin_widgets():
    """SleepPlugin exposes a sleep_summary widget."""
    from app.plugins.sleep import SleepPlugin

    plugin = SleepPlugin()
    widgets = plugin.register_widgets()
    assert len(widgets) == 1
    assert widgets[0].name == "sleep_summary"
    assert widgets[0].size == "medium"


# ---------------------------------------------------------------------------
# Unit tests for _split_sleep_by_day (timezone-aware midnight splitting)
# ---------------------------------------------------------------------------

BERLIN = ZoneInfo("Europe/Berlin")
UTC = timezone.utc


class TestSplitSleepByDay:
    """Direct unit tests for _split_sleep_by_day with Berlin timezone."""

    def _split(self, start: datetime, end: datetime) -> list[tuple[date, float]]:
        from app.plugins.sleep.router import _split_sleep_by_day
        return _split_sleep_by_day(start, end, ZoneInfo("Europe/Berlin"))

    def test_no_midnight_crossing(self):
        """Sleep within a single day — no splitting needed."""
        # 14:00-16:00 Berlin = 12:00-14:00 UTC (CEST +2)
        result = self._split(
            datetime(2026, 4, 19, 12, 0, tzinfo=UTC),
            datetime(2026, 4, 19, 14, 0, tzinfo=UTC),
        )
        assert len(result) == 1
        assert result[0] == (date(2026, 4, 19), 2.0)

    def test_overnight_split(self):
        """23:00-02:00 Berlin → 1h on day 1, 2h on day 2."""
        # 23:00 Berlin = 21:00 UTC, 02:00 Berlin = 00:00 UTC (CEST)
        result = self._split(
            datetime(2026, 4, 19, 21, 0, tzinfo=UTC),
            datetime(2026, 4, 20, 0, 0, tzinfo=UTC),
        )
        assert len(result) == 2
        assert result[0] == (date(2026, 4, 19), 1.0)
        assert result[1] == (date(2026, 4, 20), 2.0)

    def test_exactly_at_midnight(self):
        """Sleep ending exactly at Berlin midnight — no zero-minute segment."""
        # 22:00 Berlin = 20:00 UTC, 00:00 Berlin = 22:00 UTC
        result = self._split(
            datetime(2026, 4, 19, 20, 0, tzinfo=UTC),
            datetime(2026, 4, 19, 22, 0, tzinfo=UTC),
        )
        assert len(result) == 1
        assert result[0] == (date(2026, 4, 19), 2.0)

    def test_starting_at_midnight(self):
        """Sleep starting exactly at Berlin midnight."""
        # 00:00 Berlin = 22:00 UTC prev day, 03:00 Berlin = 01:00 UTC
        result = self._split(
            datetime(2026, 4, 19, 22, 0, tzinfo=UTC),
            datetime(2026, 4, 20, 1, 0, tzinfo=UTC),
        )
        assert len(result) == 1
        assert result[0] == (date(2026, 4, 20), 3.0)

    def test_spanning_two_midnights(self):
        """Very long sleep spanning two midnight boundaries."""
        # 22:00 Berlin Apr 19 = 20:00 UTC to 08:00 Berlin Apr 21 = 06:00 UTC
        result = self._split(
            datetime(2026, 4, 19, 20, 0, tzinfo=UTC),
            datetime(2026, 4, 21, 6, 0, tzinfo=UTC),
        )
        assert len(result) == 3
        assert result[0] == (date(2026, 4, 19), 2.0)   # 22:00-00:00
        assert result[1] == (date(2026, 4, 20), 24.0)   # 00:00-00:00
        assert result[2] == (date(2026, 4, 21), 8.0)    # 00:00-08:00

    def test_dst_spring_forward(self):
        """DST spring forward: 2026-03-29 02:00→03:00 Berlin (clocks skip 1h).

        Sleep 00:00-02:00 UTC = 01:00-04:00 Berlin wall clock.
        Duration = 2h real elapsed. Stays within one Berlin calendar day.
        """
        # 2026-03-29: CET→CEST, 01:00 Berlin = 00:00 UTC, 04:00 Berlin = 02:00 UTC
        result = self._split(
            datetime(2026, 3, 29, 0, 0, tzinfo=UTC),
            datetime(2026, 3, 29, 2, 0, tzinfo=UTC),
        )
        assert len(result) == 1
        assert result[0][0] == date(2026, 3, 29)
        # Duration: no midnight crossing, all on one day
        assert result[0][1] > 0

    def test_dst_fall_back(self):
        """DST fall back: 2026-10-25 03:00→02:00 Berlin (clocks repeat 1h).

        Sleep 23:00 UTC Oct 24 = 01:00 CEST Oct 25 Berlin
        to 03:00 UTC Oct 25 = 04:00 CET Oct 25 Berlin.
        All on Berlin Oct 25, no midnight crossing → 1 segment.
        """
        result = self._split(
            datetime(2026, 10, 24, 23, 0, tzinfo=UTC),
            datetime(2026, 10, 25, 3, 0, tzinfo=UTC),
        )
        # Both timestamps fall on Berlin Oct 25 (01:00 → 04:00)
        assert len(result) == 1
        assert result[0][0] == date(2026, 10, 25)
        assert result[0][1] > 0

    def test_overnight_across_dst_fall_back(self):
        """Overnight sleep crossing Berlin midnight during DST fall back."""
        # 20:00 UTC Oct 24 = 22:00 CEST Berlin Oct 24
        # 03:00 UTC Oct 25 = 04:00 CET Berlin Oct 25
        # Berlin split: 2h on Oct 24 (22:00-00:00), rest on Oct 25
        result = self._split(
            datetime(2026, 10, 24, 20, 0, tzinfo=UTC),
            datetime(2026, 10, 25, 3, 0, tzinfo=UTC),
        )
        assert len(result) == 2
        assert result[0][0] == date(2026, 10, 24)
        assert result[1][0] == date(2026, 10, 25)
        total = sum(h for _, h in result)
        assert total > 0

    def test_naive_utc_fallback(self):
        """Naive datetimes (no tzinfo) are treated as UTC."""
        result = self._split(
            datetime(2026, 4, 19, 21, 0),  # naive → assumed UTC
            datetime(2026, 4, 20, 0, 0),   # naive → assumed UTC
        )
        # 21:00 UTC = 23:00 Berlin, 00:00 UTC = 02:00 Berlin → 1h + 2h
        assert len(result) == 2
        assert result[0] == (date(2026, 4, 19), 1.0)
        assert result[1] == (date(2026, 4, 20), 2.0)


# ---------------------------------------------------------------------------
# Integration test: overnight filter in list endpoint
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_list_sleep_includes_overnight(async_client):
    """GET /api/v1/sleep/ returns entries that started before date_from but end within range."""
    child_id = await _create_child(async_client)

    # Sleep starts 23:00 Berlin (21:00 UTC) on Apr 19, ends 06:00 Berlin (04:00 UTC) on Apr 20
    await _create_sleep(
        async_client, child_id,
        start="2026-04-19T21:00:00Z",
        end="2026-04-20T04:00:00Z",
        sleep_type="night",
    )

    # Query for Apr 20 only — should still find the overnight entry
    resp = await async_client.get(
        f"/api/v1/sleep/?child_id={child_id}&date_from=2026-04-20T00:00:00Z"
    )
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["start_time"].startswith("2026-04-19")
