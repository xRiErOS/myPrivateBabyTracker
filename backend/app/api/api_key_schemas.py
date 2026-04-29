"""Pydantic schemas for API Key CRUD.

Field constraints enforce Security K3.
"""

from pydantic import BaseModel, Field, field_validator

from app.schemas.base import UTCDatetime

VALID_SCOPES = frozenset(["read", "write", "admin"])


class ApiKeyCreate(BaseModel):
    """Schema for creating a new API key."""

    name: str = Field(..., min_length=1, max_length=100)
    scopes: list[str] = Field(default=["read"], max_length=10)

    @field_validator("scopes")
    @classmethod
    def validate_scopes(cls, v: list[str]) -> list[str]:
        invalid = set(v) - VALID_SCOPES
        if invalid:
            raise ValueError(f"Ungültige Scopes: {', '.join(sorted(invalid))}. Erlaubt: {', '.join(sorted(VALID_SCOPES))}")
        if not v:
            raise ValueError("Mindestens ein Scope erforderlich")
        return v


class ApiKeyResponse(BaseModel):
    """Schema for API key list responses — WITHOUT the plain key."""

    id: int
    name: str
    key_prefix: str
    scopes: list[str]
    is_active: bool
    last_used_at: UTCDatetime | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


class ApiKeyCreateResponse(ApiKeyResponse):
    """Schema for API key creation response — WITH the plain key (one-time)."""

    key: str


class ApiKeyUpdate(BaseModel):
    """Schema for updating an API key. All fields optional."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    scopes: list[str] | None = Field(default=None, max_length=10)
    is_active: bool | None = None

    @field_validator("scopes")
    @classmethod
    def validate_scopes(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        invalid = set(v) - VALID_SCOPES
        if invalid:
            raise ValueError(f"Ungültige Scopes: {', '.join(sorted(invalid))}. Erlaubt: {', '.join(sorted(VALID_SCOPES))}")
        if not v:
            raise ValueError("Mindestens ein Scope erforderlich")
        return v
