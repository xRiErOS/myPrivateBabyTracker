"""Schemas for changelog entries (file-backed, no DB model)."""

from pydantic import BaseModel, Field


class ChangelogEntry(BaseModel):
    version: str = Field(max_length=20)
    date: str = Field(max_length=10)  # YYYY-MM-DD
    title: str = Field(max_length=200)
    entries: list[str] = Field(max_length=20)
    variant: str | None = Field(default="update", max_length=20)  # update, info, warning


class ChangelogCreate(ChangelogEntry):
    pass


class ChangelogUpdate(BaseModel):
    date: str | None = Field(default=None, max_length=10)
    title: str | None = Field(default=None, max_length=200)
    entries: list[str] | None = Field(default=None, max_length=20)
    variant: str | None = Field(default=None, max_length=20)
