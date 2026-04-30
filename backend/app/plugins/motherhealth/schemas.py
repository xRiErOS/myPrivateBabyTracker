"""Pydantic schemas for MotherHealth plugin (MBT-109 + Strukturierung).

Discriminated Union mit `entry_type` als Diskriminator.
Sicherheit (K3): max_length=4000 auf notes; VAS 0.0–10.0; Mood 1–5.
"""

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


# ---------------------------------------------------------------------------
# Enums (als Literal-Aliasse für Pydantic-Validierung)
# ---------------------------------------------------------------------------

LochiaAmount = Literal["none", "traces", "light", "moderate", "heavy"]
LochiaColor = Literal["red", "brown", "pink", "yellow", "white"]
LochiaSmell = Literal["normal", "abnormal"]
ActivityLevel = Literal["bedrest", "light", "normal"]
EntryType = Literal["lochia", "pain", "mood", "note"]


# ---------------------------------------------------------------------------
# CREATE — Discriminated Union pro entry_type
# ---------------------------------------------------------------------------

class _CreateBase(BaseModel):
    """Gemeinsame Felder für alle Create-Schemata."""

    child_id: int = Field(..., gt=0)
    notes: str | None = Field(default=None, max_length=4000)


class LochiaCreate(_CreateBase):
    entry_type: Literal["lochia"]
    lochia_amount: LochiaAmount
    lochia_color: LochiaColor
    lochia_smell: LochiaSmell
    lochia_clots: bool


class PainCreate(_CreateBase):
    entry_type: Literal["pain"]
    # Alle VAS-Skalen optional — Untouched-Default verhindert suggestive Vorbelegung.
    pain_perineum: float | None = Field(default=None, ge=0.0, le=10.0)
    pain_abdominal: float | None = Field(default=None, ge=0.0, le=10.0)
    pain_breast: float | None = Field(default=None, ge=0.0, le=10.0)
    pain_urination: float | None = Field(default=None, ge=0.0, le=10.0)


class MoodCreate(_CreateBase):
    entry_type: Literal["mood"]
    # Alle Skalen optional — Untouched-Default verhindert suggestive Vorbelegung.
    mood_level: int | None = Field(default=None, ge=1, le=5)
    wellbeing: int | None = Field(default=None, ge=1, le=5)
    exhaustion: int | None = Field(default=None, ge=1, le=5)
    activity_level: ActivityLevel | None = None


class NoteCreate(_CreateBase):
    """Freitext-only Eintrag (alter MBT-109-Stand)."""

    entry_type: Literal["note"] = "note"
    # Für note ist `notes` faktisch Pflicht — separate Validierung im Router
    notes: str = Field(..., min_length=1, max_length=4000)


MotherHealthCreate = Annotated[
    Union[LochiaCreate, PainCreate, MoodCreate, NoteCreate],
    Field(discriminator="entry_type"),
]


# ---------------------------------------------------------------------------
# UPDATE — alle typespezifischen Felder optional
# ---------------------------------------------------------------------------

class MotherHealthUpdate(BaseModel):
    """PATCH — nur die Felder des bestehenden entry_type sind sinnvoll.

    Wir erlauben hier ein flaches Schema (kein Discriminator), validieren aber
    Range/Enum. Der Router prüft die fachliche Konsistenz.
    """

    notes: str | None = Field(default=None, max_length=4000)
    # Lochia
    lochia_amount: LochiaAmount | None = None
    lochia_color: LochiaColor | None = None
    lochia_smell: LochiaSmell | None = None
    lochia_clots: bool | None = None
    # Pain
    pain_perineum: float | None = Field(default=None, ge=0.0, le=10.0)
    pain_abdominal: float | None = Field(default=None, ge=0.0, le=10.0)
    pain_breast: float | None = Field(default=None, ge=0.0, le=10.0)
    pain_urination: float | None = Field(default=None, ge=0.0, le=10.0)
    # Mood
    mood_level: int | None = Field(default=None, ge=1, le=5)
    wellbeing: int | None = Field(default=None, ge=1, le=5)
    exhaustion: int | None = Field(default=None, ge=1, le=5)
    activity_level: ActivityLevel | None = None


# ---------------------------------------------------------------------------
# RESPONSE — alle Felder, typespezifische bleiben null wenn nicht gefüllt
# ---------------------------------------------------------------------------

class MotherHealthResponse(BaseModel):
    """Response-Schema für mother-health-Einträge (alle Typen)."""

    id: int
    child_id: int
    entry_type: EntryType
    notes: str | None = None
    # Lochia
    lochia_amount: LochiaAmount | None = None
    lochia_color: LochiaColor | None = None
    lochia_smell: LochiaSmell | None = None
    lochia_clots: bool | None = None
    # Pain
    pain_perineum: float | None = None
    pain_abdominal: float | None = None
    pain_breast: float | None = None
    pain_urination: float | None = None
    # Mood
    mood_level: int | None = None
    wellbeing: int | None = None
    exhaustion: int | None = None
    activity_level: ActivityLevel | None = None

    created_at: UTCDatetime
    updated_at: UTCDatetime

    model_config = {"from_attributes": True}
