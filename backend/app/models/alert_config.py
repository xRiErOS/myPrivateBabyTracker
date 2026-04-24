"""AlertConfig model — configurable warning thresholds per child (ADR-10)."""

from sqlalchemy import Boolean, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.models.base import Base, TimestampMixin


class AlertConfig(TimestampMixin, Base):
    """Configurable alert thresholds per child.

    Each child has at most one config row. If no config exists,
    the alert service uses defaults (all disabled).
    """

    __tablename__ = "alert_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )

    # Dehydration: fewer than N wet diapers in 24h
    wet_diaper_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    wet_diaper_min: Mapped[int] = mapped_column(Integer, default=5)

    # No stool: more than N hours without dirty/mixed diaper
    no_stool_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    no_stool_hours: Mapped[int] = mapped_column(Integer, default=48)

    # Low feeding volume: less than N ml in 24h (bottle only)
    low_feeding_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    low_feeding_ml: Mapped[int] = mapped_column(Integer, default=500)

    # Fever: temperature above N °C
    fever_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    fever_threshold: Mapped[float] = mapped_column(Integer, default=38.0)

    # Feeding interval: no feeding for more than N hours
    feeding_interval_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    feeding_interval_hours: Mapped[int] = mapped_column(Integer, default=3)

    # Leap storm: alert when child is in a developmental leap storm phase
    leap_storm_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")

    # Age filter: only evaluate alerts within this age range (weeks)
    # NULL = no lower/upper bound
    min_age_weeks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=None)
    max_age_weeks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=None)

    child = relationship("Child", backref="alert_config", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("child_id", name="uq_alert_config_child"),
    )
