"""SQLAlchemy declarative base and reusable mixins."""

from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


class TimestampMixin:
    """Reusable mixin — all timestamps are UTC (W1)."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
