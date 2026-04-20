"""DiaperEntry SQLAlchemy model.

Tracks diaper changes for children.
All timestamps stored in UTC (W1).
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class DiaperEntry(TimestampMixin, Base):
    """A diaper change tracking entry for a child."""

    __tablename__ = "diaper_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    diaper_type: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # "wet" | "dirty" | "mixed" | "dry"
    color: Mapped[str | None] = mapped_column(String(30), nullable=True)
    has_rash: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationship
    child = relationship("Child", backref="diaper_entries", lazy="selectin")

    # Indexes for common queries (W4)
    __table_args__ = (
        Index("ix_diaper_entries_child_id", "child_id"),
        Index("ix_diaper_entries_time", "time"),
        Index("ix_diaper_entries_child_time", "child_id", "time"),
    )
