#!/usr/bin/env python3
"""One-time migration: Baby Buddy REST API -> MyBaby SQLite.

Usage:
    python scripts/import_babybuddy.py \
        --url https://babybuddy.example.com \
        --token API_TOKEN \
        --database data/mybaby.db \
        --dry-run

Supports: children, sleep, feedings, changes (-> diaper)
All timestamps are converted to UTC before storage (W1).
"""

from __future__ import annotations

import asyncio
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path

import httpx
import typer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Add backend to path so models are importable
_backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from app.models.base import Base  # noqa: E402
from app.models.child import Child  # noqa: E402
from app.plugins.diaper.models import DiaperEntry  # noqa: E402
from app.plugins.feeding.models import FeedingEntry  # noqa: E402
from app.plugins.sleep.models import SleepEntry  # noqa: E402

app = typer.Typer(help="Import data from Baby Buddy into MyBaby.")


# --- Data classes ---


@dataclass
class ImportStats:
    """Track import statistics."""

    children_imported: int = 0
    sleep_imported: int = 0
    feeding_imported: int = 0
    diaper_imported: int = 0
    duplicates_skipped: int = 0
    errors: int = 0
    # Dry-run counters
    sleep_would_import: int = 0
    feeding_would_import: int = 0
    diaper_would_import: int = 0

    def summary(self) -> str:
        """Return human-readable summary."""
        if any([self.sleep_would_import, self.feeding_would_import, self.diaper_would_import]):
            return (
                f"DRY RUN - Would import: "
                f"{self.sleep_would_import} sleep, "
                f"{self.feeding_would_import} feeding, "
                f"{self.diaper_would_import} diaper. "
                f"Skipped: {self.duplicates_skipped} duplicates."
            )
        return (
            f"Imported: {self.children_imported} children, "
            f"{self.sleep_imported} sleep, "
            f"{self.feeding_imported} feeding, "
            f"{self.diaper_imported} diaper. "
            f"Skipped: {self.duplicates_skipped} duplicates. "
            f"Errors: {self.errors}."
        )


# --- Mapping functions ---


def _parse_dt(value: str) -> datetime:
    """Parse ISO 8601 datetime string and convert to UTC."""
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _clean_str(value: str | None) -> str | None:
    """Return None for empty/whitespace-only strings."""
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None


def map_child(data: dict) -> dict:
    """Map Baby Buddy child to MyBaby Child fields."""
    first = (data.get("first_name") or "").strip()
    last = (data.get("last_name") or "").strip()
    name = f"{first} {last}".strip()

    return {
        "name": name,
        "birth_date": date.fromisoformat(data["birth_date"]),
    }


def map_sleep(data: dict, child_id: int) -> dict:
    """Map Baby Buddy sleep entry to MyBaby SleepEntry fields."""
    start = _parse_dt(data["start"])
    end = _parse_dt(data["end"]) if data.get("end") else None

    duration_minutes = None
    if end is not None:
        duration_minutes = int((end - start).total_seconds() / 60)

    return {
        "child_id": child_id,
        "start_time": start,
        "end_time": end,
        "duration_minutes": duration_minutes,
        "sleep_type": "nap" if data.get("nap") else "night",
        "notes": _clean_str(data.get("notes")),
    }


def map_feeding(data: dict, child_id: int) -> dict:
    """Map Baby Buddy feeding entry to MyBaby FeedingEntry fields."""
    start = _parse_dt(data["start"])
    end = _parse_dt(data["end"]) if data.get("end") else None

    duration_minutes = None
    if end is not None:
        duration_minutes = int((end - start).total_seconds() / 60)

    # Determine feeding_type from Baby Buddy type + method
    bb_type = (data.get("type") or "").lower()
    bb_method = (data.get("method") or "").lower()

    if bb_type == "breast milk":
        if "right" in bb_method:
            feeding_type = "breast_right"
        else:
            feeding_type = "breast_left"
    elif bb_type in ("formula", "fortified breast milk"):
        feeding_type = "bottle"
    elif bb_type == "solid food":
        feeding_type = "solid"
    elif "bottle" in bb_method:
        feeding_type = "bottle"
    else:
        feeding_type = "bottle"  # Safe fallback

    return {
        "child_id": child_id,
        "start_time": start,
        "end_time": end,
        "duration_minutes": duration_minutes,
        "feeding_type": feeding_type,
        "amount_ml": data.get("amount"),
        "notes": _clean_str(data.get("notes")),
    }


def map_diaper(data: dict, child_id: int) -> dict:
    """Map Baby Buddy change entry to MyBaby DiaperEntry fields."""
    wet = data.get("wet", False)
    solid = data.get("solid", False)

    if wet and solid:
        diaper_type = "mixed"
    elif wet:
        diaper_type = "wet"
    elif solid:
        diaper_type = "dirty"
    else:
        diaper_type = "dry"

    color_raw = _clean_str(data.get("color"))
    color = color_raw.lower() if color_raw else None

    return {
        "child_id": child_id,
        "time": _parse_dt(data["time"]),
        "diaper_type": diaper_type,
        "color": color,
        "notes": _clean_str(data.get("notes")),
    }


# --- Pagination ---


async def fetch_all_pages(client: httpx.AsyncClient, endpoint: str) -> list[dict]:
    """Fetch all pages from a Baby Buddy API endpoint."""
    results: list[dict] = []
    url: str | None = endpoint

    while url is not None:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        results.extend(data.get("results", []))
        url = data.get("next")

    return results


# --- Duplicate detection ---


async def is_sleep_duplicate(
    session: AsyncSession, child_id: int, start_time: datetime
) -> bool:
    """Check if a sleep entry with same child_id + start_time exists."""
    result = await session.execute(
        select(SleepEntry.id).where(
            SleepEntry.child_id == child_id,
            SleepEntry.start_time == start_time,
        )
    )
    return result.scalar_one_or_none() is not None


async def is_feeding_duplicate(
    session: AsyncSession, child_id: int, start_time: datetime
) -> bool:
    """Check if a feeding entry with same child_id + start_time exists."""
    result = await session.execute(
        select(FeedingEntry.id).where(
            FeedingEntry.child_id == child_id,
            FeedingEntry.start_time == start_time,
        )
    )
    return result.scalar_one_or_none() is not None


async def is_diaper_duplicate(
    session: AsyncSession, child_id: int, time: datetime
) -> bool:
    """Check if a diaper entry with same child_id + time exists."""
    result = await session.execute(
        select(DiaperEntry.id).where(
            DiaperEntry.child_id == child_id,
            DiaperEntry.time == time,
        )
    )
    return result.scalar_one_or_none() is not None


async def is_child_duplicate(
    session: AsyncSession, name: str, birth_date: date
) -> Child | None:
    """Check if a child with same name + birth_date exists. Returns existing child or None."""
    result = await session.execute(
        select(Child).where(
            Child.name == name,
            Child.birth_date == birth_date,
        )
    )
    return result.scalar_one_or_none()


# --- Import logic ---


async def import_entries(
    session: AsyncSession,
    sleep_entries: list[dict],
    feeding_entries: list[dict],
    diaper_entries: list[dict],
    dry_run: bool = False,
) -> ImportStats:
    """Import mapped entries into the database.

    Args:
        session: Active async DB session.
        sleep_entries: Pre-mapped sleep dicts.
        feeding_entries: Pre-mapped feeding dicts.
        diaper_entries: Pre-mapped diaper dicts.
        dry_run: If True, count but don't insert.

    Returns:
        ImportStats with counts.
    """
    stats = ImportStats()

    # Sleep
    for entry in sleep_entries:
        if await is_sleep_duplicate(session, entry["child_id"], entry["start_time"]):
            stats.duplicates_skipped += 1
            continue
        if dry_run:
            stats.sleep_would_import += 1
        else:
            session.add(SleepEntry(**entry))
            stats.sleep_imported += 1

    # Feeding
    for entry in feeding_entries:
        if await is_feeding_duplicate(session, entry["child_id"], entry["start_time"]):
            stats.duplicates_skipped += 1
            continue
        if dry_run:
            stats.feeding_would_import += 1
        else:
            session.add(FeedingEntry(**entry))
            stats.feeding_imported += 1

    # Diaper
    for entry in diaper_entries:
        if await is_diaper_duplicate(session, entry["child_id"], entry["time"]):
            stats.duplicates_skipped += 1
            continue
        if dry_run:
            stats.diaper_would_import += 1
        else:
            session.add(DiaperEntry(**entry))
            stats.diaper_imported += 1

    if not dry_run:
        await session.commit()

    return stats


# --- Main CLI ---


async def _run_import(
    url: str,
    token: str,
    database: str,
    dry_run: bool,
) -> None:
    """Core async import logic."""
    # Setup DB (sync engine for import — no need for async app infrastructure)
    db_url = f"sqlite+aiosqlite:///{database}"
    engine = create_async_engine(db_url, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False)

    # Setup HTTP client
    headers = {"Authorization": f"Token {token}"}
    base_url = url.rstrip("/")

    async with httpx.AsyncClient(base_url=base_url, headers=headers, timeout=30.0) as client:
        # 1. Import children
        typer.echo("Fetching children...")
        bb_children = await fetch_all_pages(client, "/api/children/")
        typer.echo(f"  Found {len(bb_children)} children")

        # Map Baby Buddy child ID -> MyBaby child ID
        child_id_map: dict[int, int] = {}

        async with factory() as session:
            for bb_child in bb_children:
                mapped = map_child(bb_child)
                existing = await is_child_duplicate(session, mapped["name"], mapped["birth_date"])

                if existing is not None:
                    child_id_map[bb_child["id"]] = existing.id
                    typer.echo(f"  Child '{mapped['name']}' already exists (id={existing.id})")
                elif not dry_run:
                    child = Child(**mapped)
                    session.add(child)
                    await session.commit()
                    await session.refresh(child)
                    child_id_map[bb_child["id"]] = child.id
                    typer.echo(f"  Created child '{mapped['name']}' (id={child.id})")
                else:
                    # Dry run — use placeholder ID
                    child_id_map[bb_child["id"]] = -bb_child["id"]
                    typer.echo(f"  [DRY RUN] Would create child '{mapped['name']}'")

        # 2. Fetch all data
        typer.echo("\nFetching sleep entries...")
        bb_sleep = await fetch_all_pages(client, "/api/sleep/")
        typer.echo(f"  Found {len(bb_sleep)} sleep entries")

        typer.echo("Fetching feeding entries...")
        bb_feedings = await fetch_all_pages(client, "/api/feedings/")
        typer.echo(f"  Found {len(bb_feedings)} feeding entries")

        typer.echo("Fetching diaper changes...")
        bb_diapers = await fetch_all_pages(client, "/api/changes/")
        typer.echo(f"  Found {len(bb_diapers)} diaper changes")

    # 3. Map all entries
    sleep_entries: list[dict] = []
    feeding_entries: list[dict] = []
    diaper_entries: list[dict] = []
    errors: list[str] = []

    for entry in bb_sleep:
        try:
            cid = child_id_map.get(entry["child"])
            if cid is None:
                errors.append(f"Sleep #{entry['id']}: unknown child {entry['child']}")
                continue
            sleep_entries.append(map_sleep(entry, child_id=cid))
        except Exception as e:
            errors.append(f"Sleep #{entry.get('id', '?')}: {e}")

    for entry in bb_feedings:
        try:
            cid = child_id_map.get(entry["child"])
            if cid is None:
                errors.append(f"Feeding #{entry['id']}: unknown child {entry['child']}")
                continue
            feeding_entries.append(map_feeding(entry, child_id=cid))
        except Exception as e:
            errors.append(f"Feeding #{entry.get('id', '?')}: {e}")

    for entry in bb_diapers:
        try:
            cid = child_id_map.get(entry["child"])
            if cid is None:
                errors.append(f"Diaper #{entry['id']}: unknown child {entry['child']}")
                continue
            diaper_entries.append(map_diaper(entry, child_id=cid))
        except Exception as e:
            errors.append(f"Diaper #{entry.get('id', '?')}: {e}")

    # 4. Import
    typer.echo(f"\nImporting {'(DRY RUN) ' if dry_run else ''}...")
    async with factory() as session:
        stats = await import_entries(
            session,
            sleep_entries=sleep_entries,
            feeding_entries=feeding_entries,
            diaper_entries=diaper_entries,
            dry_run=dry_run,
        )

    stats.children_imported = sum(1 for _ in child_id_map.values())
    stats.errors = len(errors)

    # 5. Report
    typer.echo(f"\n{stats.summary()}")
    if errors:
        typer.echo(f"\nErrors ({len(errors)}):")
        for err in errors[:20]:  # Show max 20
            typer.echo(f"  - {err}")
        if len(errors) > 20:
            typer.echo(f"  ... and {len(errors) - 20} more")

    await engine.dispose()


@app.command()
def main(
    url: str = typer.Option(..., "--url", help="Baby Buddy base URL (e.g. http://localhost:8000)"),
    token: str = typer.Option(..., "--token", help="Baby Buddy API token"),
    database: str = typer.Option(
        "data/mybaby.db", "--database", help="Path to MyBaby SQLite database"
    ),
    dry_run: bool = typer.Option(False, "--dry-run", help="Preview import without writing to DB"),
) -> None:
    """Import data from Baby Buddy REST API into MyBaby SQLite database."""
    typer.echo(f"Baby Buddy Import: {url}")
    typer.echo(f"Database: {database}")
    typer.echo(f"Dry run: {dry_run}\n")

    asyncio.run(_run_import(url=url, token=token, database=database, dry_run=dry_run))


if __name__ == "__main__":
    app()
