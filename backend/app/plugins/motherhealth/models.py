"""MotherHealthEntry SQLAlchemy model (MBT-109).

Privacy-first Freitext-Notizbuch fuer Wochenbett und Hebammen-Visite.
All timestamps stored in UTC (W1).

Hinweis: Auch wenn Muttergesundheit konzeptionell zur Mutter gehoert, halten wir
den child_id FK aus Konsistenz mit anderen Plugins und weil ein Eintrag im
Wochenbett zu einem konkreten Geburts-Kind gehoert.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class MotherHealthEntry(TimestampMixin, Base):
    """A mother health / postpartum note entry."""

    __tablename__ = "mother_health_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("children.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
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
    )
