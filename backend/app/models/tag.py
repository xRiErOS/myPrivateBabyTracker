"""Tag and EntryTag models — polymorphic tagging for all plugin entries.

Tags belong to a child (child_id scope). EntryTag is a polymorphic junction
table using (entry_type, entry_id) to link tags to any plugin entry type.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Tag(TimestampMixin, Base):
    """A tag belonging to a specific child."""

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#8839ef")

    # Relationships
    child = relationship("Child", backref="tags", lazy="selectin")
    entry_tags = relationship("EntryTag", back_populates="tag", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("child_id", "name", name="uq_tag_child_name"),
        Index("ix_tags_child_id", "child_id"),
    )


class EntryTag(Base):
    """Polymorphic junction: links a tag to any plugin entry."""

    __tablename__ = "entry_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tag_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False
    )
    entry_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entry_id: Mapped[int] = mapped_column(Integer, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship back to tag
    tag = relationship("Tag", back_populates="entry_tags")

    __table_args__ = (
        UniqueConstraint("tag_id", "entry_type", "entry_id", name="uq_entry_tag"),
        Index("ix_entry_tags_entry", "entry_type", "entry_id"),
        Index("ix_entry_tags_tag_id", "tag_id"),
    )
