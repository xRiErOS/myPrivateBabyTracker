"""WeightEntry SQLAlchemy model.

Tracks body weight measurements for children.
Weight stored in grams for precision.
All timestamps stored in UTC (W1).
"""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class WeightEntry(TimestampMixin, Base):
    """A body weight measurement for a child."""

    __tablename__ = "weight_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    measured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    weight_grams: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationship
    child = relationship("Child", backref="weight_entries", lazy="selectin")

    # Indexes for common queries (W4)
    __table_args__ = (
        Index("ix_weight_entries_child_id", "child_id"),
        Index("ix_weight_entries_measured_at", "measured_at"),
        Index("ix_weight_entries_child_measured", "child_id", "measured_at"),
    )
