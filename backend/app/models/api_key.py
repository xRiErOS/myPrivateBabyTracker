"""API Key model for machine-to-machine authentication."""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ApiKey(TimestampMixin, Base):
    """API Key for M2M authentication. Key is stored as Argon2 hash."""

    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    key_prefix: Mapped[str] = mapped_column(String(8), nullable=False)
    scopes: Mapped[str] = mapped_column(Text, nullable=False, default="[\"read\"]")
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
