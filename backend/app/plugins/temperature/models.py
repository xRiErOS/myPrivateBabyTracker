"""TemperatureEntry SQLAlchemy model.

Tracks body temperature measurements for children.
All timestamps stored in UTC (W1).
"""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class TemperatureEntry(TimestampMixin, Base):
    """A body temperature measurement for a child."""

    __tablename__ = "temperature_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    measured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    temperature_celsius: Mapped[float] = mapped_column(
        Float, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationship
    child = relationship("Child", backref="temperature_entries", lazy="selectin")

    # Indexes for common queries (W4)
    __table_args__ = (
        Index("ix_temperature_entries_child_id", "child_id"),
        Index("ix_temperature_entries_measured_at", "measured_at"),
        Index("ix_temperature_entries_child_measured", "child_id", "measured_at"),
    )
