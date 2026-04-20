"""AlertConfig model — configurable warning thresholds per child (ADR-10)."""

from sqlalchemy import Boolean, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

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

    child = relationship("Child", backref="alert_config", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("child_id", name="uq_alert_config_child"),
    )
