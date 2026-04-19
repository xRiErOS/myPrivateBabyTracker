"""VitaminD3Entry SQLAlchemy model.

Tracks daily Vitamin D3 administration for children.
One entry per child per date (unique constraint).
All timestamps stored in UTC (W1).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class VitaminD3Entry(TimestampMixin, Base):
    """A Vitamin D3 tracking entry — one per child per date."""

    __tablename__ = "vitamind3_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # "YYYY-MM-DD" in local time
    given_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationship
    child = relationship("Child", backref="vitamind3_entries", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("child_id", "date", name="uq_vitamind3_child_date"),
        Index("ix_vitamind3_entries_child_id", "child_id"),
        Index("ix_vitamind3_entries_date", "date"),
    )
