"""User preferences model — stores per-user settings (replaces localStorage)."""

from sqlalchemy import ForeignKey, Integer, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class UserPreferences(TimestampMixin, Base):
    """Per-user preferences. One row per user."""

    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    # MBT-175 + Folge-Refactor: breastfeeding_enabled + feeding_hybrid liegen
    # jetzt am Child-Model.
    quick_actions: Mapped[str | None] = mapped_column(Text)  # JSON array of plugin keys
    widget_order: Mapped[str | None] = mapped_column(Text)  # JSON array of widget keys
    track_visibility: Mapped[str | None] = mapped_column(Text)  # JSON object {sleep: true, ...}
    # MBT-170: Tutorial state
    tutorial_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tutorial_step: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
