"""Pydantic schemas for Todo plugin CRUD.

Field constraints enforce Security K3.
"""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.base import UTCDatetime


class TodoCreate(BaseModel):
    """Schema for creating a new todo entry."""

    child_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=1, max_length=200)
    details: str | None = Field(default=None, max_length=2000)
    due_date: datetime | None = None


class TodoUpdate(BaseModel):
    """Schema for updating a todo entry. All fields optional."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    details: str | None = Field(default=None, max_length=2000)
    due_date: datetime | None = None
    is_done: bool | None = None


class TodoResponse(BaseModel):
    """Schema for todo entry API responses."""

    id: int
    child_id: int
    title: str
    details: str | None
    due_date: UTCDatetime | None
    is_done: bool
    completed_at: UTCDatetime | None
    template_id: int | None = None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


# --- Todo Templates (Recurring Tasks) ---


class TodoTemplateCreate(BaseModel):
    """Schema for creating a todo template."""

    child_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=1, max_length=200)
    details: str | None = Field(default=None, max_length=2000)


class TodoTemplateUpdate(BaseModel):
    """Schema for updating a todo template."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    details: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class TodoTemplateResponse(BaseModel):
    """Schema for todo template API responses."""

    id: int
    child_id: int
    title: str
    details: str | None
    is_active: bool
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


# --- Habits ---


class HabitCreate(BaseModel):
    """Schema for creating a habit."""

    child_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=1, max_length=200)
    details: str | None = Field(default=None, max_length=2000)
    recurrence: Literal["daily", "weekly"] = "daily"
    weekdays: list[int] | None = None  # 0=Mon..6=Sun, only for weekly

    @field_validator("weekdays")
    @classmethod
    def validate_weekdays(cls, v: list[int] | None) -> list[int] | None:
        if v is not None:
            for day in v:
                if day < 0 or day > 6:
                    raise ValueError("weekdays must be integers 0-6")
        return v


class HabitUpdate(BaseModel):
    """Schema for updating a habit (partial)."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    details: str | None = Field(default=None, max_length=2000)
    recurrence: Literal["daily", "weekly"] | None = None
    weekdays: list[int] | None = None
    is_active: bool | None = None

    @field_validator("weekdays")
    @classmethod
    def validate_weekdays(cls, v: list[int] | None) -> list[int] | None:
        if v is not None:
            for day in v:
                if day < 0 or day > 6:
                    raise ValueError("weekdays must be integers 0-6")
        return v


class HabitCompletionResponse(BaseModel):
    """Schema for a habit completion record."""

    id: int
    habit_id: int
    child_id: int
    completed_date: date
    completed_at: UTCDatetime

    model_config = {"from_attributes": True}


class HabitResponse(BaseModel):
    """Schema for habit API responses, includes today's completion status and streak."""

    id: int
    child_id: int
    title: str
    details: str | None
    recurrence: str
    weekdays: list[int] | None = None
    is_active: bool
    streak: int = 0
    completed_today: bool = False
    created_at: UTCDatetime

    model_config = {"from_attributes": True}

    @field_validator("weekdays", mode="before")
    @classmethod
    def parse_weekdays(cls, v: str | list | None) -> list[int] | None:
        """Parse comma-separated weekdays string from DB into list."""
        if v is None or v == "":
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [int(x) for x in v.split(",") if x.strip()]
        return v
