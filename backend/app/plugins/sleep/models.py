"""SleepEntry SQLAlchemy model.

Tracks sleep sessions for children — both naps and night sleep.
All timestamps stored in UTC (W1).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SleepEntry(TimestampMixin, Base):
    """A sleep tracking entry for a child."""

    __tablename__ = "sleep_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_type: Mapped[str] = mapped_column(String(10), nullable=False)  # "nap" | "night"
    location: Mapped[str | None] = mapped_column(String(50), nullable=True)
    quality: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationship
    child = relationship("Child", backref="sleep_entries", lazy="selectin")

    # Indexes for common queries (W4)
    __table_args__ = (
        Index("ix_sleep_entries_child_id", "child_id"),
        Index("ix_sleep_entries_start_time", "start_time"),
        Index("ix_sleep_entries_child_start", "child_id", "start_time"),
    )
