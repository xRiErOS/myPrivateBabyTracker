"""SharedNote SQLAlchemy model.

Simple shared notes for parent communication.
All timestamps stored in UTC (W1).
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SharedNote(TimestampMixin, Base):
    """A shared note between parents for a child."""

    __tablename__ = "shared_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    author_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    child = relationship("Child", backref="shared_notes", lazy="selectin")
    author = relationship("User", lazy="selectin")

    __table_args__ = (
        Index("ix_shared_notes_child_id", "child_id"),
        Index("ix_shared_notes_child_pinned", "child_id", "pinned"),
    )
