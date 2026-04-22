"""User management schemas — CRUD for admin user management."""

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class UserCreate(BaseModel):
    """Create a new local user (admin only)."""

    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=200)
    display_name: str | None = Field(default=None, max_length=200)
    role: str = Field(default="caregiver", pattern="^(admin|caregiver)$")
    locale: str = Field(default="de", max_length=10)
    timezone: str = Field(default="Europe/Berlin", max_length=50)


class UserUpdate(BaseModel):
    """Update user (admin only, partial update)."""

    display_name: str | None = Field(default=None, max_length=200)
    role: str | None = Field(default=None, pattern="^(admin|caregiver)$")
    locale: str | None = Field(default=None, max_length=10)
    timezone: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None


class UserAdminResponse(BaseModel):
    """Full user info for admin listing."""

    id: int
    username: str
    display_name: str | None
    role: str
    auth_type: str
    locale: str
    timezone: str
    is_active: bool
    totp_enabled: bool
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


class SetPasswordRequest(BaseModel):
    """Admin sets password for a user."""

    password: str = Field(min_length=8, max_length=200)
