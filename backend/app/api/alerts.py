"""Alert API — config + active warnings for a child."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.alert import AlertConfigResponse, AlertConfigUpdate, AlertsResponse
from app.services.alert_service import evaluate_alerts, get_or_create_config

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/config", response_model=AlertConfigResponse)
async def get_alert_config(
    child_id: int = Query(..., gt=0),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get alert config for a child (creates defaults if none exists)."""
    config = await get_or_create_config(db, child_id)
    return config


@router.patch("/config", response_model=AlertConfigResponse)
async def update_alert_config(
    child_id: int = Query(..., gt=0),
    data: AlertConfigUpdate = ...,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update alert config thresholds for a child."""
    config = await get_or_create_config(db, child_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    await db.commit()
    await db.refresh(config)
    return config


@router.get("/", response_model=AlertsResponse)
async def get_active_alerts(
    child_id: int = Query(..., gt=0),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Evaluate and return all active alerts for a child."""
    alerts = await evaluate_alerts(db, child_id)
    return AlertsResponse(child_id=child_id, alerts=alerts)
