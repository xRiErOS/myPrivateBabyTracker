"""TummyTimeEntry SQLAlchemy model.

Tracks tummy time sessions for children.
All timestamps stored in UTC (W1).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class TummyTimeEntry(TimestampMixin, Base):
    """A tummy time tracking entry for a child."""

    __tablename__ = "tummy_time_entries"

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
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationship
    child = relationship("Child", backref="tummy_time_entries", lazy="selectin")

    # Indexes for common queries (W4)
    __table_args__ = (
        Index("ix_tummy_time_entries_child_id", "child_id"),
        Index("ix_tummy_time_entries_start_time", "start_time"),
        Index("ix_tummy_time_entries_child_start", "child_id", "start_time"),
    )
