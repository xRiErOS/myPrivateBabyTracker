"""Tests for Baby Buddy import script.

TDD: Tests written first, then implementation.
Tests cover: mapping functions, duplicate detection, dry-run, pagination.
"""

import os
import sys
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure environment is set before any app imports
os.environ.setdefault("SECRET_KEY", "a" * 32)
os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("AUTH_MODE", "disabled")
os.environ.setdefault("ENVIRONMENT", "dev")

# Add project root so scripts package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.models.base import Base
from app.models.child import Child
from app.plugins.diaper.models import DiaperEntry
from app.plugins.feeding.models import FeedingEntry
from app.plugins.sleep.models import SleepEntry

from scripts.import_babybuddy import (
    map_child,
    map_diaper,
    map_feeding,
    map_sleep,
    fetch_all_pages,
    ImportStats,
)


# --- Fixtures ---


@pytest.fixture
async def engine():
    """In-memory async SQLite engine."""
    eng = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture
async def session(engine) -> AsyncSession:
    """Async session for tests."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as sess:
        yield sess


# --- Baby Buddy sample data ---

SAMPLE_CHILD = {
    "id": 1,
    "first_name": "Emma",
    "last_name": "Riedel",
    "birth_date": "2025-01-15",
}

SAMPLE_SLEEP = {
    "id": 10,
    "child": 1,
    "start": "2025-06-10T20:00:00+02:00",
    "end": "2025-06-11T06:30:00+02:00",
    "duration": "10:30:00",
    "nap": False,
    "notes": "Slept well",
}

SAMPLE_SLEEP_NAP = {
    "id": 11,
    "child": 1,
    "start": "2025-06-10T13:00:00+02:00",
    "end": "2025-06-10T14:30:00+02:00",
    "duration": "01:30:00",
    "nap": True,
    "notes": None,
}

SAMPLE_FEEDING_BREAST_LEFT = {
    "id": 20,
    "child": 1,
    "start": "2025-06-10T08:00:00+02:00",
    "end": "2025-06-10T08:20:00+02:00",
    "duration": "00:20:00",
    "type": "breast milk",
    "method": "left breast",
    "amount": None,
    "notes": "",
}

SAMPLE_FEEDING_BREAST_RIGHT = {
    "id": 21,
    "child": 1,
    "start": "2025-06-10T12:00:00+02:00",
    "end": "2025-06-10T12:15:00+02:00",
    "duration": "00:15:00",
    "type": "breast milk",
    "method": "right breast",
    "amount": None,
    "notes": None,
}

SAMPLE_FEEDING_BOTTLE = {
    "id": 22,
    "child": 1,
    "start": "2025-06-10T18:00:00+02:00",
    "end": "2025-06-10T18:10:00+02:00",
    "duration": "00:10:00",
    "type": "formula",
    "method": "bottle",
    "amount": 120.0,
    "notes": "Pre-mixed formula",
}

SAMPLE_FEEDING_SOLID = {
    "id": 23,
    "child": 1,
    "start": "2025-06-10T12:00:00+02:00",
    "end": "2025-06-10T12:30:00+02:00",
    "duration": "00:30:00",
    "type": "solid food",
    "method": "parent fed",
    "amount": None,
    "notes": "Carrots",
}

SAMPLE_FEEDING_FORTIFIED = {
    "id": 24,
    "child": 1,
    "start": "2025-06-10T15:00:00+02:00",
    "end": "2025-06-10T15:10:00+02:00",
    "duration": "00:10:00",
    "type": "fortified breast milk",
    "method": "bottle",
    "amount": 100.0,
    "notes": None,
}

SAMPLE_DIAPER_WET = {
    "id": 30,
    "child": 1,
    "time": "2025-06-10T09:00:00+02:00",
    "wet": True,
    "solid": False,
    "color": "",
    "amount": None,
    "notes": "",
}

SAMPLE_DIAPER_DIRTY = {
    "id": 31,
    "child": 1,
    "time": "2025-06-10T11:00:00+02:00",
    "wet": False,
    "solid": True,
    "color": "Yellow",
    "amount": None,
    "notes": None,
}

SAMPLE_DIAPER_MIXED = {
    "id": 32,
    "child": 1,
    "time": "2025-06-10T14:00:00+02:00",
    "wet": True,
    "solid": True,
    "color": "Brown",
    "amount": None,
    "notes": "After lunch",
}

SAMPLE_DIAPER_DRY = {
    "id": 33,
    "child": 1,
    "time": "2025-06-10T16:00:00+02:00",
    "wet": False,
    "solid": False,
    "color": "",
    "amount": None,
    "notes": None,
}


# --- Mapping Tests ---


class TestMapChild:
    """Test Baby Buddy child → MyBaby Child mapping."""

    def test_maps_name(self):
        result = map_child(SAMPLE_CHILD)
        assert result["name"] == "Emma Riedel"

    def test_maps_birth_date(self):
        result = map_child(SAMPLE_CHILD)
        assert result["birth_date"] == date(2025, 1, 15)

    def test_single_name(self):
        data = {**SAMPLE_CHILD, "last_name": ""}
        result = map_child(data)
        assert result["name"] == "Emma"

    def test_no_first_name(self):
        data = {**SAMPLE_CHILD, "first_name": "", "last_name": "Riedel"}
        result = map_child(data)
        assert result["name"] == "Riedel"


class TestMapSleep:
    """Test Baby Buddy sleep → MyBaby SleepEntry mapping."""

    def test_night_sleep(self):
        result = map_sleep(SAMPLE_SLEEP, child_id=1)
        assert result["sleep_type"] == "night"
        assert result["child_id"] == 1
        assert result["notes"] == "Slept well"
        # Timestamps converted to UTC
        assert result["start_time"].tzinfo is not None

    def test_nap(self):
        result = map_sleep(SAMPLE_SLEEP_NAP, child_id=1)
        assert result["sleep_type"] == "nap"

    def test_duration_calculated(self):
        result = map_sleep(SAMPLE_SLEEP, child_id=1)
        assert result["duration_minutes"] == 630  # 10h30m

    def test_timestamps_utc(self):
        result = map_sleep(SAMPLE_SLEEP, child_id=1)
        # Input is +02:00, so UTC should be 2 hours earlier
        assert result["start_time"].hour == 18  # 20:00+02:00 = 18:00 UTC
        assert result["end_time"].hour == 4  # 06:30+02:00 = 04:30 UTC


class TestMapFeeding:
    """Test Baby Buddy feeding → MyBaby FeedingEntry mapping."""

    def test_breast_left(self):
        result = map_feeding(SAMPLE_FEEDING_BREAST_LEFT, child_id=1)
        assert result["feeding_type"] == "breast_left"
        assert result["amount_ml"] is None

    def test_breast_right(self):
        result = map_feeding(SAMPLE_FEEDING_BREAST_RIGHT, child_id=1)
        assert result["feeding_type"] == "breast_right"

    def test_bottle_formula(self):
        result = map_feeding(SAMPLE_FEEDING_BOTTLE, child_id=1)
        assert result["feeding_type"] == "bottle"
        assert result["amount_ml"] == 120.0
        assert result["notes"] == "Pre-mixed formula"

    def test_solid_food(self):
        result = map_feeding(SAMPLE_FEEDING_SOLID, child_id=1)
        assert result["feeding_type"] == "solid"

    def test_fortified_breast_milk(self):
        result = map_feeding(SAMPLE_FEEDING_FORTIFIED, child_id=1)
        assert result["feeding_type"] == "bottle"
        assert result["amount_ml"] == 100.0

    def test_duration_calculated(self):
        result = map_feeding(SAMPLE_FEEDING_BREAST_LEFT, child_id=1)
        assert result["duration_minutes"] == 20

    def test_empty_notes_become_none(self):
        result = map_feeding(SAMPLE_FEEDING_BREAST_LEFT, child_id=1)
        assert result["notes"] is None


class TestMapDiaper:
    """Test Baby Buddy changes → MyBaby DiaperEntry mapping."""

    def test_wet(self):
        result = map_diaper(SAMPLE_DIAPER_WET, child_id=1)
        assert result["diaper_type"] == "wet"
        assert result["child_id"] == 1

    def test_dirty(self):
        result = map_diaper(SAMPLE_DIAPER_DIRTY, child_id=1)
        assert result["diaper_type"] == "dirty"
        assert result["color"] == "yellow"  # lowercase

    def test_mixed(self):
        result = map_diaper(SAMPLE_DIAPER_MIXED, child_id=1)
        assert result["diaper_type"] == "mixed"

    def test_dry(self):
        result = map_diaper(SAMPLE_DIAPER_DRY, child_id=1)
        assert result["diaper_type"] == "dry"

    def test_empty_color_becomes_none(self):
        result = map_diaper(SAMPLE_DIAPER_WET, child_id=1)
        assert result["color"] is None

    def test_empty_notes_become_none(self):
        result = map_diaper(SAMPLE_DIAPER_WET, child_id=1)
        assert result["notes"] is None

    def test_timestamp_utc(self):
        result = map_diaper(SAMPLE_DIAPER_WET, child_id=1)
        assert result["time"].hour == 7  # 09:00+02:00 = 07:00 UTC


class TestFetchAllPages:
    """Test pagination handling."""

    @pytest.mark.asyncio
    async def test_single_page(self):
        """Single page with no next link."""
        mock_client = AsyncMock()
        response = MagicMock()
        response.json.return_value = {
            "count": 2,
            "next": None,
            "results": [{"id": 1}, {"id": 2}],
        }
        response.raise_for_status = MagicMock()
        mock_client.get = AsyncMock(return_value=response)

        results = await fetch_all_pages(mock_client, "/api/sleep/")
        assert len(results) == 2
        mock_client.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_multiple_pages(self):
        """Multiple pages via next URL."""
        mock_client = AsyncMock()

        page1 = MagicMock()
        page1.json.return_value = {
            "count": 3,
            "next": "http://example.com/api/sleep/?limit=2&offset=2",
            "results": [{"id": 1}, {"id": 2}],
        }
        page1.raise_for_status = MagicMock()

        page2 = MagicMock()
        page2.json.return_value = {
            "count": 3,
            "next": None,
            "results": [{"id": 3}],
        }
        page2.raise_for_status = MagicMock()

        mock_client.get = AsyncMock(side_effect=[page1, page2])

        results = await fetch_all_pages(mock_client, "/api/sleep/")
        assert len(results) == 3
        assert mock_client.get.call_count == 2


class TestDuplicateDetection:
    """Test that duplicate entries are skipped."""

    @pytest.mark.asyncio
    async def test_sleep_duplicate_skipped(self, session: AsyncSession):
        """Pre-existing sleep entry with same child_id + start_time is skipped."""
        # Insert a child first
        child = Child(name="Emma Riedel", birth_date=date(2025, 1, 15))
        session.add(child)
        await session.commit()
        await session.refresh(child)

        # Insert existing sleep entry
        existing = SleepEntry(
            child_id=child.id,
            start_time=datetime(2025, 6, 10, 18, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2025, 6, 11, 4, 30, 0, tzinfo=timezone.utc),
            duration_minutes=630,
            sleep_type="night",
        )
        session.add(existing)
        await session.commit()

        # Import the same entry — should detect duplicate
        from scripts.import_babybuddy import is_sleep_duplicate

        is_dup = await is_sleep_duplicate(
            session,
            child_id=child.id,
            start_time=datetime(2025, 6, 10, 18, 0, 0, tzinfo=timezone.utc),
        )
        assert is_dup is True

    @pytest.mark.asyncio
    async def test_sleep_not_duplicate(self, session: AsyncSession):
        """Different start_time is not a duplicate."""
        child = Child(name="Emma Riedel", birth_date=date(2025, 1, 15))
        session.add(child)
        await session.commit()
        await session.refresh(child)

        from scripts.import_babybuddy import is_sleep_duplicate

        is_dup = await is_sleep_duplicate(
            session,
            child_id=child.id,
            start_time=datetime(2025, 6, 10, 18, 0, 0, tzinfo=timezone.utc),
        )
        assert is_dup is False

    @pytest.mark.asyncio
    async def test_feeding_duplicate_skipped(self, session: AsyncSession):
        """Pre-existing feeding with same child_id + start_time is skipped."""
        child = Child(name="Emma Riedel", birth_date=date(2025, 1, 15))
        session.add(child)
        await session.commit()
        await session.refresh(child)

        existing = FeedingEntry(
            child_id=child.id,
            start_time=datetime(2025, 6, 10, 6, 0, 0, tzinfo=timezone.utc),
            feeding_type="breast_left",
        )
        session.add(existing)
        await session.commit()

        from scripts.import_babybuddy import is_feeding_duplicate

        is_dup = await is_feeding_duplicate(
            session,
            child_id=child.id,
            start_time=datetime(2025, 6, 10, 6, 0, 0, tzinfo=timezone.utc),
        )
        assert is_dup is True

    @pytest.mark.asyncio
    async def test_diaper_duplicate_skipped(self, session: AsyncSession):
        """Pre-existing diaper with same child_id + time is skipped."""
        child = Child(name="Emma Riedel", birth_date=date(2025, 1, 15))
        session.add(child)
        await session.commit()
        await session.refresh(child)

        existing = DiaperEntry(
            child_id=child.id,
            time=datetime(2025, 6, 10, 7, 0, 0, tzinfo=timezone.utc),
            diaper_type="wet",
        )
        session.add(existing)
        await session.commit()

        from scripts.import_babybuddy import is_diaper_duplicate

        is_dup = await is_diaper_duplicate(
            session,
            child_id=child.id,
            time=datetime(2025, 6, 10, 7, 0, 0, tzinfo=timezone.utc),
        )
        assert is_dup is True


class TestDryRun:
    """Test dry-run mode: no DB changes."""

    @pytest.mark.asyncio
    async def test_dry_run_no_inserts(self, session: AsyncSession):
        """In dry-run mode, nothing is written to DB."""
        from scripts.import_babybuddy import import_entries

        child = Child(name="Emma Riedel", birth_date=date(2025, 1, 15))
        session.add(child)
        await session.commit()
        await session.refresh(child)

        sleep_data = [map_sleep(SAMPLE_SLEEP, child_id=child.id)]

        stats = await import_entries(
            session,
            sleep_entries=sleep_data,
            feeding_entries=[],
            diaper_entries=[],
            dry_run=True,
        )

        assert stats.sleep_imported == 0
        assert stats.sleep_would_import == 1

        # Verify nothing in DB
        result = await session.execute(select(SleepEntry))
        assert len(result.scalars().all()) == 0


class TestImportStats:
    """Test ImportStats summary."""

    def test_summary_string(self):
        stats = ImportStats()
        stats.children_imported = 1
        stats.sleep_imported = 50
        stats.feeding_imported = 100
        stats.diaper_imported = 200
        stats.duplicates_skipped = 5

        summary = stats.summary()
        assert "1 children" in summary
        assert "50 sleep" in summary
        assert "100 feeding" in summary
        assert "200 diaper" in summary
        assert "5 duplicates" in summary
