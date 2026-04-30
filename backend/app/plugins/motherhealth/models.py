"""MotherHealthEntry SQLAlchemy model (MBT-109 + Erweiterung).

Privacy-first Wochenbett-/Hebammen-Notizbuch. Discriminated-Union-Pattern
analog zum Health-Plugin: ein entry_type pro Zeile, typespezifische Spalten
nullable.

Eintragstypen:
- note: nur `notes` (Freitext, alter MBT-109-Stand)
- lochia: Wochenfluss (amount/color/smell/clots) + optional notes
- pain: VAS 0–10 (perineum/abdominal/breast/urination) + optional notes
- mood: Stimmung (mood_level/wellbeing/exhaustion + activity_level) + optional notes

All timestamps stored in UTC (W1).
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class MotherHealthEntry(TimestampMixin, Base):
    """A mother health / postpartum entry (lochia | pain | mood | note)."""

    __tablename__ = "mother_health_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    entry_type: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="note"
    )  # "lochia" | "pain" | "mood" | "note"

    # Freitext (alle Typen, optional)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Lochia (Wochenfluss)
    lochia_amount: Mapped[str | None] = mapped_column(String(10), nullable=True)
    lochia_color: Mapped[str | None] = mapped_column(String(10), nullable=True)
    lochia_smell: Mapped[str | None] = mapped_column(String(10), nullable=True)
    lochia_clots: Mapped[bool | None] = mapped_column(Boolean(), nullable=True)

    # Pain (VAS 0.0–10.0)
    pain_perineum: Mapped[float | None] = mapped_column(Float(), nullable=True)
    pain_abdominal: Mapped[float | None] = mapped_column(Float(), nullable=True)
    pain_breast: Mapped[float | None] = mapped_column(Float(), nullable=True)
    pain_urination: Mapped[float | None] = mapped_column(Float(), nullable=True)

    # Mood / Stimmung
    mood_level: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    wellbeing: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    exhaustion: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    activity_level: Mapped[str | None] = mapped_column(String(10), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    child = relationship("Child", backref="mother_health_entries", lazy="selectin")

    __table_args__ = (
        Index("ix_mother_health_entries_child_id", "child_id"),
        Index("ix_mother_health_entries_entry_type", "entry_type"),
    )
