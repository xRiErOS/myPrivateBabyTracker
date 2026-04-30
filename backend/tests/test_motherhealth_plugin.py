"""Tests for the MotherHealth plugin (MBT-109 + Strukturierung).

Covers:
- CRUD für `note`-Typ (alter MBT-109-Stand, jetzt expliziter Typ)
- POST/Validation für `lochia`, `pain`, `mood`
- Filter via ?entry_type=
"""

import pytest
from httpx import AsyncClient


async def _create_child(client: AsyncClient) -> int:
    resp = await client.post(
        "/api/v1/children/",
        json={"name": "Test Baby", "birth_date": "2025-06-01"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_note(client: AsyncClient, child_id: int, **kwargs) -> dict:
    data = {
        "child_id": child_id,
        "entry_type": "note",
        "notes": kwargs.get("notes", "Hebammen-Visite: alles gut."),
    }
    resp = await client.post("/api/v1/motherhealth/", json=data)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# CRUD Tests — Note (Freitext)
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_create_note_entry(async_client):
    """POST creates a 'note' entry."""
    child_id = await _create_child(async_client)
    data = await _create_note(async_client, child_id, notes="Wochenbett Tag 3.")
    assert data["notes"] == "Wochenbett Tag 3."
    assert data["entry_type"] == "note"
    assert data["child_id"] == child_id
    assert data["lochia_amount"] is None
    assert data["pain_perineum"] is None


@pytest.mark.anyio
async def test_list_entries(async_client):
    """GET returns all entries for child."""
    child_id = await _create_child(async_client)
    await _create_note(async_client, child_id, notes="Eintrag 1")
    await _create_note(async_client, child_id, notes="Eintrag 2")

    resp = await async_client.get(f"/api/v1/motherhealth/?child_id={child_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.anyio
async def test_get_entry(async_client):
    """GET single by ID."""
    child_id = await _create_child(async_client)
    entry = await _create_note(async_client, child_id)
    resp = await async_client.get(f"/api/v1/motherhealth/{entry['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == entry["id"]


@pytest.mark.anyio
async def test_get_entry_not_found(async_client):
    resp = await async_client.get("/api/v1/motherhealth/999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_note_entry(async_client):
    """PATCH updates notes."""
    child_id = await _create_child(async_client)
    entry = await _create_note(async_client, child_id)
    resp = await async_client.patch(
        f"/api/v1/motherhealth/{entry['id']}", json={"notes": "Aktualisiert"}
    )
    assert resp.status_code == 200
    assert resp.json()["notes"] == "Aktualisiert"


@pytest.mark.anyio
async def test_delete_entry(async_client):
    child_id = await _create_child(async_client)
    entry = await _create_note(async_client, child_id)
    resp = await async_client.delete(f"/api/v1/motherhealth/{entry['id']}")
    assert resp.status_code == 204
    resp = await async_client.get(f"/api/v1/motherhealth/{entry['id']}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_note_required_when_type_is_note(async_client):
    """Empty notes rejected for entry_type='note'."""
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={"child_id": child_id, "entry_type": "note", "notes": ""},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_notes_max_length_4000(async_client):
    """notes max 4000 chars."""
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={"child_id": child_id, "entry_type": "note", "notes": "x" * 4001},
    )
    assert resp.status_code == 422

    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={"child_id": child_id, "entry_type": "note", "notes": "x" * 4000},
    )
    assert resp.status_code == 201


@pytest.mark.anyio
async def test_list_sorted_newest_first(async_client):
    child_id = await _create_child(async_client)
    e1 = await _create_note(async_client, child_id, notes="First")
    e2 = await _create_note(async_client, child_id, notes="Second")

    resp = await async_client.get(f"/api/v1/motherhealth/?child_id={child_id}")
    entries = resp.json()
    assert entries[0]["id"] == e2["id"]
    assert entries[1]["id"] == e1["id"]


# ---------------------------------------------------------------------------
# Lochia Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_create_lochia_entry(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={
            "child_id": child_id,
            "entry_type": "lochia",
            "lochia_amount": "moderate",
            "lochia_color": "red",
            "lochia_smell": "normal",
            "lochia_clots": False,
            "notes": "Tag 5",
        },
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["entry_type"] == "lochia"
    assert data["lochia_amount"] == "moderate"
    assert data["lochia_color"] == "red"
    assert data["lochia_smell"] == "normal"
    assert data["lochia_clots"] is False
    assert data["notes"] == "Tag 5"
    # Andere Typen-Felder bleiben null
    assert data["pain_perineum"] is None
    assert data["mood_level"] is None


@pytest.mark.anyio
async def test_lochia_invalid_enum_rejected(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={
            "child_id": child_id,
            "entry_type": "lochia",
            "lochia_amount": "ocean",  # invalid
            "lochia_color": "red",
            "lochia_smell": "normal",
            "lochia_clots": False,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_lochia_missing_required_field(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={
            "child_id": child_id,
            "entry_type": "lochia",
            "lochia_amount": "light",
            # color/smell/clots missing
        },
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Pain (VAS) Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_create_pain_entry(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={
            "child_id": child_id,
            "entry_type": "pain",
            "pain_perineum": 3.5,
            "pain_abdominal": 5.0,
            "pain_breast": 0.0,
            "pain_urination": 1.5,
        },
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["entry_type"] == "pain"
    assert data["pain_perineum"] == 3.5
    assert data["pain_abdominal"] == 5.0
    assert data["pain_breast"] == 0.0
    assert data["pain_urination"] == 1.5


@pytest.mark.anyio
async def test_pain_vas_out_of_range_rejected(async_client):
    """VAS > 10.0 abgelehnt."""
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={
            "child_id": child_id,
            "entry_type": "pain",
            "pain_perineum": 11.0,
            "pain_abdominal": 0.0,
            "pain_breast": 0.0,
            "pain_urination": 0.0,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_pain_vas_negative_rejected(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={
            "child_id": child_id,
            "entry_type": "pain",
            "pain_perineum": -0.5,
            "pain_abdominal": 0.0,
            "pain_breast": 0.0,
            "pain_urination": 0.0,
        },
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Mood Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_create_mood_entry(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={
            "child_id": child_id,
            "entry_type": "mood",
            "mood_level": 4,
            "wellbeing": 3,
            "exhaustion": 5,
            "activity_level": "light",
        },
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["mood_level"] == 4
    assert data["wellbeing"] == 3
    assert data["exhaustion"] == 5
    assert data["activity_level"] == "light"


@pytest.mark.anyio
async def test_mood_out_of_range_rejected(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={
            "child_id": child_id,
            "entry_type": "mood",
            "mood_level": 6,  # > 5
            "wellbeing": 3,
            "exhaustion": 3,
            "activity_level": "normal",
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_activity_level_invalid_rejected(async_client):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/motherhealth/",
        json={
            "child_id": child_id,
            "entry_type": "mood",
            "mood_level": 3,
            "wellbeing": 3,
            "exhaustion": 3,
            "activity_level": "marathon",  # invalid
        },
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Filter Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_filter_by_entry_type(async_client):
    """GET ?entry_type=lochia liefert nur Lochia-Einträge."""
    child_id = await _create_child(async_client)
    await _create_note(async_client, child_id, notes="Notiz 1")
    await async_client.post(
        "/api/v1/motherhealth/",
        json={
            "child_id": child_id,
            "entry_type": "lochia",
            "lochia_amount": "light",
            "lochia_color": "brown",
            "lochia_smell": "normal",
            "lochia_clots": False,
        },
    )

    resp = await async_client.get(
        f"/api/v1/motherhealth/?child_id={child_id}&entry_type=lochia"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["entry_type"] == "lochia"

    resp = await async_client.get(
        f"/api/v1/motherhealth/?child_id={child_id}&entry_type=note"
    )
    data = resp.json()
    assert len(data) == 1
    assert data[0]["entry_type"] == "note"


@pytest.mark.anyio
async def test_plugin_discovery(async_client):
    """Plugin-Router ist erreichbar."""
    child_id = await _create_child(async_client)
    entry = await _create_note(async_client, child_id)
    assert entry["id"] > 0
