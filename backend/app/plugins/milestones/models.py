"""Milestones plugin SQLAlchemy models.

Five tables: milestone_categories, milestone_templates, milestone_entries,
milestone_photos, leap_definitions.
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
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class MilestoneCategory(TimestampMixin, Base):
    """Milestone category — 8 system defaults + custom per child."""

    __tablename__ = "milestone_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#8839ef")
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    child_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=True
    )

    # Relationships
    templates = relationship("MilestoneTemplate", back_populates="category", lazy="selectin")
    entries = relationship("MilestoneEntry", back_populates="category", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("name", "child_id", name="uq_category_name_child"),
    )


class MilestoneTemplate(TimestampMixin, Base):
    """Seed-based milestone template (WHO/CDC-inspired + emotional events)."""

    __tablename__ = "milestone_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("milestone_categories.id", ondelete="CASCADE"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "medical" | "emotional" | "leap"
    suggested_age_weeks_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    suggested_age_weeks_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    category = relationship("MilestoneCategory", back_populates="templates", lazy="selectin")

    __table_args__ = (
        Index("ix_milestone_templates_category", "category_id"),
        Index("ix_milestone_templates_source", "source_type"),
    )


class MilestoneEntry(TimestampMixin, Base):
    """A child-specific milestone entry (completed or pending)."""

    __tablename__ = "milestone_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("milestone_templates.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("milestone_categories.id", ondelete="CASCADE"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "medical" | "emotional" | "custom"
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    completed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    confidence: Mapped[str] = mapped_column(
        String(20), nullable=False, default="exact"
    )  # "exact" | "approximate" | "unsure"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    category = relationship("MilestoneCategory", back_populates="entries", lazy="selectin")
    template = relationship("MilestoneTemplate", lazy="selectin")
    photos = relationship(
        "MilestonePhoto", back_populates="entry", lazy="selectin", cascade="all, delete-orphan"
    )
    child = relationship("Child", backref="milestone_entries", lazy="selectin")

    __table_args__ = (
        Index("ix_milestone_entries_child", "child_id"),
        Index("ix_milestone_entries_child_completed", "child_id", "completed"),
        Index("ix_milestone_entries_child_category", "child_id", "category_id"),
        Index("ix_milestone_entries_child_date", "child_id", "completed_date"),
    )


class MilestonePhoto(TimestampMixin, Base):
    """Photo attached to a milestone entry."""

    __tablename__ = "milestone_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    milestone_entry_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("milestone_entries.id", ondelete="CASCADE"), nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(200), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # Relationships
    entry = relationship("MilestoneEntry", back_populates="photos", lazy="selectin")

    __table_args__ = (
        Index("ix_milestone_photos_entry", "milestone_entry_id"),
    )


class LeapDefinition(TimestampMixin, Base):
    """Development leap definition (Plooij-inspired, 10 leaps)."""

    __tablename__ = "leap_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    leap_number: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    storm_start_weeks: Mapped[float] = mapped_column(Float, nullable=False)
    storm_end_weeks: Mapped[float] = mapped_column(Float, nullable=False)
    sun_start_weeks: Mapped[float] = mapped_column(Float, nullable=False)
    new_skills: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    storm_signs: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
