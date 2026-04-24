"""TodoEntry, TodoTemplate, Habit and HabitCompletion SQLAlchemy models.

Simple task list for topics to discuss with pediatrician or midwife.
TodoTemplate supports recurring tasks via manual clone-to-today.
Habit supports true recurring habits with daily/weekly patterns and streak tracking.
All timestamps stored in UTC (W1).
"""

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, func
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


class Habit(TimestampMixin, Base):
    """A recurring habit for a child.

    Habits recur daily or on specific weekdays (0=Mon, 6=Sun).
    The weekdays field stores a comma-separated list of integers, e.g. '0,2,4' for Mon/Wed/Fri.
    """

    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    # "daily" or "weekly" (specific weekdays)
    recurrence: Mapped[str] = mapped_column(String(10), nullable=False, default="daily")
    # Comma-separated weekday numbers (0=Mon..6=Sun), used when recurrence="weekly"
    weekdays: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    child = relationship("Child", backref="habits", lazy="selectin")
    completions = relationship(
        "HabitCompletion", back_populates="habit", cascade="all, delete-orphan", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_habits_child_id", "child_id"),
    )


class HabitCompletion(Base):
    """A single completion record for a habit on a specific date."""

    __tablename__ = "habit_completions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    habit_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("habits.id", ondelete="CASCADE"), nullable=False
    )
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    completed_date: Mapped[date] = mapped_column(Date, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=func.now()
    )

    # Relationship
    habit = relationship("Habit", back_populates="completions", lazy="selectin")

    __table_args__ = (
        Index("ix_habit_completions_habit_id", "habit_id"),
        Index("ix_habit_completions_child_date", "child_id", "completed_date"),
    )
