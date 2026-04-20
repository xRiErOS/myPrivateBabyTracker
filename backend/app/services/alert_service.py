"""Alert service — evaluates warning rules against recent data (ADR-10)."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert_config import AlertConfig
from app.plugins.diaper.models import DiaperEntry
from app.plugins.feeding.models import FeedingEntry
from app.plugins.temperature.models import TemperatureEntry
from app.schemas.alert import Alert


async def get_or_create_config(db: AsyncSession, child_id: int) -> AlertConfig:
    """Get alert config for a child, creating defaults if none exists."""
    result = await db.execute(
        select(AlertConfig).where(AlertConfig.child_id == child_id)
    )
    config = result.scalar_one_or_none()
    if config is None:
        config = AlertConfig(child_id=child_id)
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


async def evaluate_alerts(db: AsyncSession, child_id: int) -> list[Alert]:
    """Evaluate all enabled alert rules and return active warnings."""
    config = await get_or_create_config(db, child_id)
    alerts: list[Alert] = []
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)

    # 1. Wet diaper check
    if config.wet_diaper_enabled:
        result = await db.execute(
            select(func.count()).where(
                DiaperEntry.child_id == child_id,
                DiaperEntry.time >= day_ago,
                DiaperEntry.diaper_type.in_(["wet", "mixed"]),
            )
        )
        wet_count = result.scalar() or 0
        if wet_count < config.wet_diaper_min:
            severity = "critical" if wet_count <= 2 else "warning"
            alerts.append(Alert(
                type="wet_diaper",
                severity=severity,
                message=f"Nur {wet_count} nasse Windeln in 24h (Minimum: {config.wet_diaper_min})",
                value=wet_count,
                threshold=config.wet_diaper_min,
            ))

    # 2. No stool check
    if config.no_stool_enabled:
        result = await db.execute(
            select(DiaperEntry.time).where(
                DiaperEntry.child_id == child_id,
                DiaperEntry.diaper_type.in_(["dirty", "mixed"]),
            ).order_by(DiaperEntry.time.desc()).limit(1)
        )
        last_stool = result.scalar_one_or_none()
        if last_stool is not None:
            hours_since = (now - last_stool.replace(tzinfo=timezone.utc)).total_seconds() / 3600
            if hours_since > config.no_stool_hours:
                alerts.append(Alert(
                    type="no_stool",
                    severity="warning",
                    message=f"Kein Stuhlgang seit {int(hours_since)} Stunden (Schwelle: {config.no_stool_hours}h)",
                    value=int(hours_since),
                    threshold=config.no_stool_hours,
                ))
        else:
            # No stool entries at all
            alerts.append(Alert(
                type="no_stool",
                severity="warning",
                message="Noch kein Stuhlgang erfasst",
            ))

    # 3. Low feeding volume (bottle only)
    if config.low_feeding_enabled:
        result = await db.execute(
            select(func.coalesce(func.sum(FeedingEntry.amount_ml), 0)).where(
                FeedingEntry.child_id == child_id,
                FeedingEntry.start_time >= day_ago,
                FeedingEntry.feeding_type == "bottle",
            )
        )
        total_ml = result.scalar() or 0
        if total_ml < config.low_feeding_ml:
            alerts.append(Alert(
                type="low_feeding",
                severity="warning",
                message=f"Nur {total_ml} ml Flasche in 24h (Minimum: {config.low_feeding_ml} ml)",
                value=total_ml,
                threshold=config.low_feeding_ml,
            ))

    # 4. Fever check (latest temperature)
    if config.fever_enabled:
        result = await db.execute(
            select(TemperatureEntry).where(
                TemperatureEntry.child_id == child_id,
            ).order_by(TemperatureEntry.measured_at.desc()).limit(1)
        )
        latest_temp = result.scalar_one_or_none()
        if latest_temp is not None and latest_temp.temperature_celsius >= config.fever_threshold:
            severity = "critical" if latest_temp.temperature_celsius >= 39.0 else "warning"
            alerts.append(Alert(
                type="fever",
                severity=severity,
                message=f"Temperatur {latest_temp.temperature_celsius:.1f} °C (Schwelle: {config.fever_threshold:.1f} °C)",
                value=latest_temp.temperature_celsius,
                threshold=config.fever_threshold,
            ))

    return alerts
