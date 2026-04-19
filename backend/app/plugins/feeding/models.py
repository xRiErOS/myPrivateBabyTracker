"""FeedingEntry SQLAlchemy model.

Stores feeding events: breastfeeding (left/right), bottle, and solid food.
All timestamps are UTC (W1).
"""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class FeedingEntry(TimestampMixin, Base):
    """A single feeding event for a child."""

    __tablename__ = "feeding_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    feeding_type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount_ml: Mapped[float | None] = mapped_column(Float, nullable=True)
    food_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    child = relationship("Child", backref="feeding_entries", lazy="selectin")
