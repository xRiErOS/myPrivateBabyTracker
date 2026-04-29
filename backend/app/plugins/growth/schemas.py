"""Pydantic schemas for Growth plugin API responses."""

from typing import Literal

from pydantic import BaseModel


Metric = Literal["weight", "length"]


class PercentilePoint(BaseModel):
    """A single point on a percentile curve."""

    age_weeks: float
    p3: float
    p15: float
    p50: float
    p85: float
    p97: float


class WeightDataPoint(BaseModel):
    """A measurement mapped to age. `value` unit depends on metric (kg | cm)."""

    age_weeks: float
    value: float
    measured_at: str


class GrowthChartResponse(BaseModel):
    """Full growth chart data: percentile curves + actual measurements."""

    child_name: str
    gender: str | None
    is_preterm: bool
    corrected_age_offset_weeks: float
    metric: Metric
    percentile_curves: list[PercentilePoint]
    measurements: list[WeightDataPoint]
