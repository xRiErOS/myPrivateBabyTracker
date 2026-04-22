"""User model — supports forward-auth and local auth (dual-mode)."""

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    """Application user. Forward-auth users have no password_hash."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(200))
    auth_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="forward_auth"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="caregiver")
    locale: Mapped[str] = mapped_column(String(10), nullable=False, default="de")
    totp_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
