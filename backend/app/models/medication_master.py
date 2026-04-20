"""MedicationMaster model — predefined medication catalog.

Provides dropdown selection instead of free-text entry.
Stores name, active ingredient, default unit, and active status.
"""

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class MedicationMaster(TimestampMixin, Base):
    """A predefined medication for dropdown selection."""

    __tablename__ = "medication_masters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    active_ingredient: Mapped[str | None] = mapped_column(String(200), nullable=True)
    default_unit: Mapped[str] = mapped_column(String(50), nullable=False, default="Tablette")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
