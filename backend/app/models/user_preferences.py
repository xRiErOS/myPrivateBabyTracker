"""User preferences model — stores per-user settings (replaces localStorage)."""

from sqlalchemy import ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class UserPreferences(TimestampMixin, Base):
    """Per-user preferences. One row per user."""

    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    breastfeeding_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    feeding_hybrid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quick_actions: Mapped[str | None] = mapped_column(Text)  # JSON array of plugin keys
    widget_order: Mapped[str | None] = mapped_column(Text)  # JSON array of widget keys
    track_visibility: Mapped[str | None] = mapped_column(Text)  # JSON object {sleep: true, ...}
