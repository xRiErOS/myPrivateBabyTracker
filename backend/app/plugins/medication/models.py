"""MedicationEntry SQLAlchemy model.

Tracks medication administration for children.
Supports any medication with name, dose, and optional frequency.
All timestamps stored in UTC (W1).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class MedicationEntry(TimestampMixin, Base):
    """A medication administration entry for a child."""

    __tablename__ = "medication_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    given_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    medication_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dose: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationship
    child = relationship("Child", backref="medication_entries", lazy="selectin")

    # Indexes for common queries (W4)
    __table_args__ = (
        Index("ix_medication_entries_child_id", "child_id"),
        Index("ix_medication_entries_given_at", "given_at"),
        Index("ix_medication_entries_child_given", "child_id", "given_at"),
    )
