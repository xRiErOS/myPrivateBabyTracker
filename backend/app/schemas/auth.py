"""Auth schemas — login, user response, auth status."""

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class LoginRequest(BaseModel):
    """Login with username + password."""

    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


class UserResponse(BaseModel):
    """Public user info (returned by /auth/me)."""

    id: int
    username: str
    display_name: str | None
    role: str
    auth_type: str
    locale: str
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


class AuthStatusResponse(BaseModel):
    """Current auth configuration status."""

    auth_mode: str
    authenticated: bool
    user: UserResponse | None = None


class ChangePasswordRequest(BaseModel):
    """Change own password (local auth users only)."""

    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=8, max_length=200)
