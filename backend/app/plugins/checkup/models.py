"""CheckupEntry and CheckupType SQLAlchemy models.

Tracks U-Untersuchungen (U1-U9) with scheduled and actual dates,
measurements, and doctor notes.
All timestamps stored in UTC (W1).
"""

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CheckupType(Base):
    """Predefined checkup type (U1-U9) with recommended age range."""

    __tablename__ = "checkup_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(10), nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    recommended_age_weeks_min: Mapped[int] = mapped_column(Integer, nullable=False)
    recommended_age_weeks_max: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class CheckupEntry(TimestampMixin, Base):
    """A completed or scheduled U-Untersuchung for a child."""

    __tablename__ = "checkup_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    checkup_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("checkup_types.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    doctor: Mapped[str | None] = mapped_column(String(200), nullable=True)
    weight_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    head_circumference_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    child = relationship("Child", backref="checkup_entries", lazy="selectin")
    checkup_type = relationship("CheckupType", lazy="selectin")

    __table_args__ = (
        Index("ix_checkup_entries_child_id", "child_id"),
        Index("ix_checkup_entries_child_type", "child_id", "checkup_type_id"),
    )
