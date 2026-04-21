"""TodoEntry and TodoTemplate SQLAlchemy models.

Simple task list for topics to discuss with pediatrician or midwife.
TodoTemplate supports recurring tasks via manual clone-to-today.
All timestamps stored in UTC (W1).
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class TodoEntry(TimestampMixin, Base):
    """A todo item for a child."""

    __tablename__ = "todo_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    template_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("todo_templates.id", ondelete="SET NULL"), nullable=True
    )

    # Relationship
    child = relationship("Child", backref="todo_entries", lazy="selectin")

    __table_args__ = (
        Index("ix_todo_entries_child_id", "child_id"),
        Index("ix_todo_entries_child_done", "child_id", "is_done"),
    )


class TodoTemplate(TimestampMixin, Base):
    """A reusable todo template for recurring tasks."""

    __tablename__ = "todo_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationship
    child = relationship("Child", backref="todo_templates", lazy="selectin")

    __table_args__ = (
        Index("ix_todo_templates_child_id", "child_id"),
    )
