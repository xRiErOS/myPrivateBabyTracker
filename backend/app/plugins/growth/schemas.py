"""Pydantic schemas for Growth plugin API responses."""

from pydantic import BaseModel


class PercentilePoint(BaseModel):
    """A single point on a percentile curve."""

    age_weeks: float
    p3: float
    p15: float
    p50: float
    p85: float
    p97: float


class WeightDataPoint(BaseModel):
    """A child's actual weight measurement mapped to age."""

    age_weeks: float
    weight_kg: float
    measured_at: str


class GrowthChartResponse(BaseModel):
    """Full growth chart data: percentile curves + actual measurements."""

    child_name: str
    gender: str | None
    is_preterm: bool
    corrected_age_offset_weeks: float
    percentile_curves: list[PercentilePoint]
    measurements: list[WeightDataPoint]
