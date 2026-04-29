"""User preferences router — get/update per-user settings."""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.user_preferences import UserPreferences
from app.schemas.preferences import PreferencesResponse, PreferencesUpdate

logger = get_logger("preferences")

router = APIRouter(prefix="/preferences", tags=["preferences"])


def _to_response(prefs: UserPreferences, user: User) -> PreferencesResponse:
    """Convert model to response, parsing JSON fields."""
    return PreferencesResponse(
        feeding_hybrid=prefs.feeding_hybrid,
        quick_actions=json.loads(prefs.quick_actions) if prefs.quick_actions else None,
        widget_order=json.loads(prefs.widget_order) if prefs.widget_order else None,
        track_visibility=json.loads(prefs.track_visibility) if prefs.track_visibility else None,
        timezone=user.timezone or "Europe/Berlin",
        locale=user.locale or "de",
        tutorial_completed=prefs.tutorial_completed,
        tutorial_step=prefs.tutorial_step,
    )


async def _get_or_create_prefs(user: User, db: AsyncSession) -> UserPreferences:
    """Get or auto-create preferences for user."""
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == user.id)
    )
    prefs = result.scalar_one_or_none()
    if prefs is None:
        prefs = UserPreferences(user_id=user.id)
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
    return prefs


@router.get("/", response_model=PreferencesResponse)
async def get_preferences(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get current user's preferences. Auto-creates defaults if missing."""
    if user is None:
        # Disabled auth mode — return defaults
        return PreferencesResponse()

    prefs = await _get_or_create_prefs(user, db)
    return _to_response(prefs, user)


@router.patch("/", response_model=PreferencesResponse)
async def update_preferences(
    data: PreferencesUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update current user's preferences (partial update)."""
    if user is None:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")

    prefs = await _get_or_create_prefs(user, db)

    update = data.model_dump(exclude_unset=True)

    # Handle JSON fields
    if "quick_actions" in update:
        prefs.quick_actions = json.dumps(update.pop("quick_actions")) if update["quick_actions"] is not None else None
    if "widget_order" in update:
        prefs.widget_order = json.dumps(update.pop("widget_order")) if update["widget_order"] is not None else None
    if "track_visibility" in update:
        prefs.track_visibility = json.dumps(update.pop("track_visibility")) if update["track_visibility"] is not None else None

    # Handle timezone and locale (stored on User, not Preferences)
    if "timezone" in update:
        user.timezone = update.pop("timezone")
    if "locale" in update:
        user.locale = update.pop("locale")

    # Simple fields
    for field, value in update.items():
        if hasattr(prefs, field):
            setattr(prefs, field, value)

    await db.commit()
    await db.refresh(prefs)

    logger.info("preferences_updated", user_id=user.id)
    return _to_response(prefs, user)
