"""Growth chart API — WHO percentile curves with child weight overlay.

Supports preterm correction: uses estimated_birth_date for age calculation
when child.is_preterm is True.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.child import Child
from app.models.user import User
from app.plugins.growth.schemas import (
    GrowthChartResponse,
    PercentilePoint,
    WeightDataPoint,
)
from app.plugins.growth.who_data import get_who_data, interpolate_percentile
from app.plugins.weight.models import WeightEntry

logger = get_logger("growth")

router = APIRouter(prefix="/growth", tags=["growth"])


def _age_in_weeks(birth: date, measured: date) -> float:
    """Calculate age in weeks between two dates."""
    return (measured - birth).days / 7.0


@router.get("/chart/{child_id}", response_model=GrowthChartResponse)
async def get_growth_chart(
    child_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Return WHO percentile curves and child's weight measurements.

    For preterm children, age is corrected using estimated_birth_date.
    """
    # Load child
    result = await db.execute(select(Child).where(Child.id == child_id))
    child = result.scalar_one_or_none()
    if child is None:
        raise NotFoundError(f"Child with id {child_id} not found")

    # Determine reference date for age calculation
    reference_date = child.birth_date
    corrected_offset_weeks = 0.0
    if child.is_preterm and child.estimated_birth_date:
        corrected_offset_weeks = (
            child.estimated_birth_date - child.birth_date
        ).days / 7.0
        reference_date = child.estimated_birth_date

    # Load WHO data
    who_data = get_who_data(child.gender)

    # Build percentile curves (every 2 weeks from 0 to 104)
    percentile_curves: list[PercentilePoint] = []
    for week in range(0, 105, 2):
        p3, p15, p50, p85, p97 = interpolate_percentile(who_data, float(week))
        percentile_curves.append(
            PercentilePoint(
                age_weeks=float(week),
                p3=p3,
                p15=p15,
                p50=p50,
                p85=p85,
                p97=p97,
            )
        )

    # Load weight entries
    weight_result = await db.execute(
        select(WeightEntry)
        .where(WeightEntry.child_id == child_id)
        .order_by(WeightEntry.measured_at)
    )
    entries = weight_result.scalars().all()

    measurements: list[WeightDataPoint] = []
    for entry in entries:
        measured_date = entry.measured_at.date() if hasattr(entry.measured_at, 'date') else entry.measured_at
        age_weeks = _age_in_weeks(reference_date, measured_date)
        measurements.append(
            WeightDataPoint(
                age_weeks=round(age_weeks, 1),
                weight_kg=round(entry.weight_grams / 1000.0, 2),
                measured_at=entry.measured_at.isoformat() if hasattr(entry.measured_at, 'isoformat') else str(entry.measured_at),
            )
        )

    return GrowthChartResponse(
        child_name=child.name,
        gender=child.gender,
        is_preterm=child.is_preterm,
        corrected_age_offset_weeks=round(corrected_offset_weeks, 1),
        percentile_curves=percentile_curves,
        measurements=measurements,
    )
