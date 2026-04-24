"""Changelog CRUD router — reads/writes data/changelog.json (persistent volume)."""

import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.changelog import ChangelogCreate, ChangelogEntry, ChangelogUpdate

logger = get_logger("changelog")

router = APIRouter(prefix="/changelog", tags=["changelog"])

# Persistent data directory (same volume as the SQLite DB: /app/data/ in container)
_CHANGELOG_PATH = Path("data") / "changelog.json"


def _load() -> list[dict]:
    if not _CHANGELOG_PATH.exists():
        return []
    with _CHANGELOG_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save(data: list[dict]) -> None:
    _CHANGELOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _CHANGELOG_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@router.get("", response_model=list[ChangelogEntry])
async def list_changelog(
    _current_user: User = Depends(get_current_user),
) -> list[dict]:
    """Return all changelog entries sorted by version descending."""
    data = _load()
    data.sort(key=lambda e: e.get("version", ""), reverse=True)
    return data


@router.post("", response_model=ChangelogEntry, status_code=status.HTTP_201_CREATED)
async def create_changelog_entry(
    payload: ChangelogCreate,
    _current_user: User = Depends(get_current_user),
) -> dict:
    """Create a new changelog entry. Version must be unique."""
    data = _load()
    if any(e["version"] == payload.version for e in data):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Version '{payload.version}' already exists.",
        )
    entry = payload.model_dump()
    data.insert(0, entry)
    _save(data)
    logger.info("changelog_created", version=payload.version)
    return entry


@router.put("/{version}", response_model=ChangelogEntry)
async def update_changelog_entry(
    version: str,
    payload: ChangelogUpdate,
    _current_user: User = Depends(get_current_user),
) -> dict:
    """Update an existing changelog entry by version."""
    data = _load()
    for entry in data:
        if entry["version"] == version:
            if payload.date is not None:
                entry["date"] = payload.date
            if payload.title is not None:
                entry["title"] = payload.title
            if payload.entries is not None:
                entry["entries"] = payload.entries
            _save(data)
            logger.info("changelog_updated", version=version)
            return entry
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Version '{version}' not found.",
    )


@router.delete("/{version}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_changelog_entry(
    version: str,
    _current_user: User = Depends(get_current_user),
) -> None:
    """Delete a changelog entry by version."""
    data = _load()
    new_data = [e for e in data if e["version"] != version]
    if len(new_data) == len(data):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version '{version}' not found.",
        )
    _save(new_data)
    logger.info("changelog_deleted", version=version)
