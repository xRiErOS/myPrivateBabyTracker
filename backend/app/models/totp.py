"""TOTP 2FA model — stores TOTP secrets and backup codes per user."""

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class TotpSecret(TimestampMixin, Base):
    """TOTP secret for a user. Only one active secret per user."""

    __tablename__ = "totp_secrets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    secret: Mapped[str] = mapped_column(String(64), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    backup_codes: Mapped[str | None] = mapped_column(Text)  # JSON array of hashed codes
