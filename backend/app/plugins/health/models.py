"""HealthEntry SQLAlchemy model.

Tracks gastrointestinal symptoms (spit-up, tummy ache) for children.
All timestamps stored in UTC (W1).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class HealthEntry(TimestampMixin, Base):
    """A health tracking entry for a child."""

    __tablename__ = "health_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    entry_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "spit_up" | "tummy_ache"
    severity: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # "mild" | "moderate" | "severe"
    duration: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )  # "short" | "medium" | "long" — only for tummy_ache
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    feeding_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("feeding_entries.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    child = relationship("Child", backref="health_entries", lazy="selectin")
    feeding = relationship("FeedingEntry", lazy="selectin")

    # Indexes for common queries (W4)
    __table_args__ = (
        Index("ix_health_entries_child_id", "child_id"),
        Index("ix_health_entries_time", "time"),
        Index("ix_health_entries_child_time", "child_id", "time"),
    )
