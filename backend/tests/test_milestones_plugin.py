"""Tests for the Milestones plugin — categories, templates, entries, photos, leaps, discovery."""

import io
from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.plugins.milestones.models import (
    LeapDefinition,
    MilestoneCategory,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_child(
    async_client: AsyncClient,
    name: str = "TestBaby",
    birth_date: str = "2025-06-01",
    estimated_birth_date: str | None = None,
    is_preterm: bool = False,
) -> int:
    """Create a child and return its ID."""
    payload: dict = {"name": name, "birth_date": birth_date}
    if estimated_birth_date:
        payload["estimated_birth_date"] = estimated_birth_date
    if is_preterm:
        payload["is_preterm"] = is_preterm
    resp = await async_client.post("/api/v1/children/", json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_category(
    async_client: AsyncClient,
    child_id: int,
    name: str = "TestKategorie",
    color: str = "#8839ef",
) -> dict:
    """Create a custom milestone category and return the response JSON."""
    resp = await async_client.post(
        "/api/v1/milestone-categories/",
        json={"name": name, "color": color, "child_id": child_id},
    )
    assert resp.status_code == 201
    return resp.json()


async def _create_milestone(
    async_client: AsyncClient,
    child_id: int,
    category_id: int,
    title: str = "Erster Schritt",
    **kwargs,
) -> dict:
    """Create a milestone entry and return the response JSON."""
    payload = {
        "child_id": child_id,
        "category_id": category_id,
        "title": title,
        "source_type": "custom",
        **kwargs,
    }
    resp = await async_client.post("/api/v1/milestones/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _insert_system_category(async_session: AsyncSession) -> int:
    """Insert a system category directly into the DB and return its ID."""
    result = await async_session.execute(
        insert(MilestoneCategory).values(
            name="Motorik",
            color="#1e66f5",
            icon="activity",
            is_system=True,
            child_id=None,
        )
    )
    await async_session.commit()
    return result.inserted_primary_key[0]


async def _insert_leap(async_session: AsyncSession, **overrides) -> int:
    """Insert a leap definition directly into the DB and return its ID."""
    values = {
        "leap_number": 1,
        "title": "Sprung 1 — Muster",
        "description": "Das Baby erkennt Muster in der Welt.",
        "storm_start_weeks": 4.5,
        "storm_end_weeks": 5.5,
        "sun_start_weeks": 6.0,
        "new_skills": '["Muster erkennen"]',
        "storm_signs": '["Weinen", "Klammern"]',
        "sort_order": 1,
        **overrides,
    }
    result = await async_session.execute(insert(LeapDefinition).values(**values))
    await async_session.commit()
    return result.inserted_primary_key[0]


# ---------------------------------------------------------------------------
# 1. Category CRUD (7 Tests)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_custom_category(async_client):
    """POST /api/v1/milestone-categories/ creates a custom category."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)

    assert cat["id"] is not None
    assert cat["name"] == "TestKategorie"
    assert cat["color"] == "#8839ef"
    assert cat["is_system"] is False
    assert cat["child_id"] == child_id


@pytest.mark.anyio
async def test_list_categories_returns_system_and_custom(async_client, async_session):
    """GET /api/v1/milestone-categories/ returns system + custom for a child."""
    child_id = await _create_child(async_client)
    await _insert_system_category(async_session)
    await _create_category(async_client, child_id, name="Eigene Kategorie")

    resp = await async_client.get(f"/api/v1/milestone-categories/?child_id={child_id}")
    assert resp.status_code == 200
    cats = resp.json()
    names = {c["name"] for c in cats}
    assert "Motorik" in names
    assert "Eigene Kategorie" in names


@pytest.mark.anyio
async def test_update_custom_category(async_client):
    """PATCH /api/v1/milestone-categories/{id} updates name and color."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)

    resp = await async_client.patch(
        f"/api/v1/milestone-categories/{cat['id']}",
        json={"name": "Umbenannt", "color": "#dc8a78"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Umbenannt"
    assert resp.json()["color"] == "#dc8a78"


@pytest.mark.anyio
async def test_cannot_update_system_category(async_client, async_session):
    """PATCH on a system category returns 403."""
    sys_id = await _insert_system_category(async_session)

    resp = await async_client.patch(
        f"/api/v1/milestone-categories/{sys_id}",
        json={"name": "Versuch"},
    )
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_cannot_delete_system_category(async_client, async_session):
    """DELETE on a system category returns 403."""
    sys_id = await _insert_system_category(async_session)

    resp = await async_client.delete(f"/api/v1/milestone-categories/{sys_id}")
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_delete_custom_category(async_client):
    """DELETE /api/v1/milestone-categories/{id} removes a custom category."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)

    resp = await async_client.delete(f"/api/v1/milestone-categories/{cat['id']}")
    assert resp.status_code == 204


@pytest.mark.anyio
async def test_cannot_delete_category_with_entries(async_client):
    """DELETE returns 409 when a category still has milestone entries."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    await _create_milestone(async_client, child_id, cat["id"])

    resp = await async_client.delete(f"/api/v1/milestone-categories/{cat['id']}")
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# 2. Template Listing (3 Tests)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_list_templates(async_client):
    """GET /api/v1/milestone-templates/ returns a list (empty without seed data)."""
    resp = await async_client.get("/api/v1/milestone-templates/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.anyio
async def test_filter_templates_by_source_type(async_client):
    """GET /api/v1/milestone-templates/?source_type= filters correctly."""
    resp = await async_client.get("/api/v1/milestone-templates/?source_type=medical")
    assert resp.status_code == 200
    for t in resp.json():
        assert t["source_type"] == "medical"


@pytest.mark.anyio
async def test_get_suggestions_for_child(async_client):
    """GET /api/v1/milestone-templates/suggestions?child_id= returns suggestions."""
    child_id = await _create_child(async_client)

    resp = await async_client.get(
        f"/api/v1/milestone-templates/suggestions?child_id={child_id}"
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------------------------------------------------------------------------
# 3. Entry CRUD (10 Tests)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_milestone_entry(async_client):
    """POST /api/v1/milestones/ creates a milestone entry."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    entry = await _create_milestone(async_client, child_id, cat["id"])

    assert entry["id"] is not None
    assert entry["child_id"] == child_id
    assert entry["category_id"] == cat["id"]
    assert entry["title"] == "Erster Schritt"
    assert entry["source_type"] == "custom"
    assert entry["completed"] is False
    assert entry["confidence"] == "exact"
    assert entry["photos"] == []


@pytest.mark.anyio
async def test_create_with_template_id(async_client):
    """POST /api/v1/milestones/ accepts an optional template_id."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)

    # template_id is a FK to milestone_templates — without seed data there is no
    # valid template, so we just test that the field is accepted (template_id=None).
    entry = await _create_milestone(
        async_client, child_id, cat["id"], template_id=None
    )
    assert entry["template_id"] is None


@pytest.mark.anyio
async def test_list_entries_filter_by_child(async_client):
    """GET /api/v1/milestones/?child_id= filters by child."""
    child1 = await _create_child(async_client, "Baby1")
    child2 = await _create_child(async_client, "Baby2")
    cat1 = await _create_category(async_client, child1, name="Kat1")
    cat2 = await _create_category(async_client, child2, name="Kat2")
    await _create_milestone(async_client, child1, cat1["id"], title="A")
    await _create_milestone(async_client, child2, cat2["id"], title="B")

    resp = await async_client.get(f"/api/v1/milestones/?child_id={child1}")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["child_id"] == child1


@pytest.mark.anyio
async def test_list_entries_filter_by_completed(async_client):
    """GET /api/v1/milestones/?completed=true filters correctly."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    await _create_milestone(async_client, child_id, cat["id"], title="A", completed=False)
    await _create_milestone(
        async_client, child_id, cat["id"],
        title="B", completed=True, completed_date="2026-04-01",
    )

    resp = await async_client.get("/api/v1/milestones/?completed=true")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["completed"] is True


@pytest.mark.anyio
async def test_list_entries_filter_by_category(async_client):
    """GET /api/v1/milestones/?category_id= filters correctly."""
    child_id = await _create_child(async_client)
    cat1 = await _create_category(async_client, child_id, name="Kat1")
    cat2 = await _create_category(async_client, child_id, name="Kat2")
    await _create_milestone(async_client, child_id, cat1["id"], title="A")
    await _create_milestone(async_client, child_id, cat2["id"], title="B")

    resp = await async_client.get(f"/api/v1/milestones/?category_id={cat1['id']}")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["category_id"] == cat1["id"]


@pytest.mark.anyio
async def test_list_entries_search_q(async_client):
    """GET /api/v1/milestones/?q= searches title and notes."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    await _create_milestone(async_client, child_id, cat["id"], title="Erstes Lachen")
    await _create_milestone(async_client, child_id, cat["id"], title="Greifen")

    resp = await async_client.get("/api/v1/milestones/?q=Lachen")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert "Lachen" in entries[0]["title"]


@pytest.mark.anyio
async def test_get_entry_by_id(async_client):
    """GET /api/v1/milestones/{id} returns a single entry."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    created = await _create_milestone(async_client, child_id, cat["id"])

    resp = await async_client.get(f"/api/v1/milestones/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


@pytest.mark.anyio
async def test_get_entry_not_found(async_client):
    """GET /api/v1/milestones/{id} returns 404 for non-existent entry."""
    resp = await async_client.get("/api/v1/milestones/9999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_entry(async_client):
    """PATCH /api/v1/milestones/{id} updates fields."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    created = await _create_milestone(async_client, child_id, cat["id"])

    resp = await async_client.patch(
        f"/api/v1/milestones/{created['id']}",
        json={
            "title": "Erster richtiger Schritt",
            "notes": "Im Wohnzimmer",
            "completed": True,
            "completed_date": "2026-04-15",
            "confidence": "approximate",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Erster richtiger Schritt"
    assert data["notes"] == "Im Wohnzimmer"
    assert data["completed"] is True
    assert data["completed_date"] == "2026-04-15"
    assert data["confidence"] == "approximate"


@pytest.mark.anyio
async def test_delete_entry(async_client):
    """DELETE /api/v1/milestones/{id} removes the entry."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    created = await _create_milestone(async_client, child_id, cat["id"])

    resp = await async_client.delete(f"/api/v1/milestones/{created['id']}")
    assert resp.status_code == 204

    # Verify it's gone
    resp = await async_client.get(f"/api/v1/milestones/{created['id']}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 4. Quick-Complete (3 Tests)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_complete_milestone(async_client):
    """POST /api/v1/milestones/{id}/complete marks entry as completed."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    created = await _create_milestone(async_client, child_id, cat["id"])

    resp = await async_client.post(
        f"/api/v1/milestones/{created['id']}/complete",
        json={"completed_date": "2026-04-20", "confidence": "exact"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["completed"] is True
    assert data["completed_date"] == "2026-04-20"
    assert data["confidence"] == "exact"


@pytest.mark.anyio
async def test_complete_milestone_not_found(async_client):
    """POST /api/v1/milestones/{id}/complete returns 404 for non-existent."""
    resp = await async_client.post(
        "/api/v1/milestones/9999/complete",
        json={"completed_date": "2026-04-20", "confidence": "exact"},
    )
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_complete_sets_date_and_confidence(async_client):
    """Quick-complete stores date, confidence and optional notes."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    created = await _create_milestone(async_client, child_id, cat["id"])

    resp = await async_client.post(
        f"/api/v1/milestones/{created['id']}/complete",
        json={
            "completed_date": "2026-03-15",
            "confidence": "unsure",
            "notes": "Ungefaehr Mitte Maerz",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["completed_date"] == "2026-03-15"
    assert data["confidence"] == "unsure"
    assert data["notes"] == "Ungefaehr Mitte Maerz"


# ---------------------------------------------------------------------------
# 5. Photo Upload (5 Tests)
# ---------------------------------------------------------------------------

FAKE_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 100


@pytest.mark.anyio
async def test_upload_photo_success(async_client, tmp_path, monkeypatch):
    """POST /api/v1/milestones/{id}/photo uploads a JPEG file."""
    # Redirect upload base to tmp_path to avoid writing to real filesystem
    monkeypatch.setattr(
        "app.plugins.milestones.router.UPLOAD_BASE", str(tmp_path)
    )

    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    entry = await _create_milestone(async_client, child_id, cat["id"])

    resp = await async_client.post(
        f"/api/v1/milestones/{entry['id']}/photo",
        files={"file": ("foto.jpg", io.BytesIO(FAKE_JPEG), "image/jpeg")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["milestone_entry_id"] == entry["id"]
    assert data["mime_type"] == "image/jpeg"
    assert data["file_size"] == len(FAKE_JPEG)
    assert data["file_name"] == "foto.jpg"


@pytest.mark.anyio
async def test_upload_invalid_mime_type(async_client):
    """POST /api/v1/milestones/{id}/photo rejects non-image files (400)."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    entry = await _create_milestone(async_client, child_id, cat["id"])

    resp = await async_client.post(
        f"/api/v1/milestones/{entry['id']}/photo",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    assert resp.status_code == 400


@pytest.mark.anyio
async def test_upload_for_nonexistent_entry(async_client):
    """POST /api/v1/milestones/{id}/photo returns 404 for missing entry."""
    resp = await async_client.post(
        "/api/v1/milestones/9999/photo",
        files={"file": ("foto.jpg", io.BytesIO(FAKE_JPEG), "image/jpeg")},
    )
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_photo(async_client, tmp_path, monkeypatch):
    """DELETE /api/v1/milestones/{id}/photo/{photo_id} removes the photo."""
    monkeypatch.setattr(
        "app.plugins.milestones.router.UPLOAD_BASE", str(tmp_path)
    )

    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    entry = await _create_milestone(async_client, child_id, cat["id"])

    # Upload first
    upload_resp = await async_client.post(
        f"/api/v1/milestones/{entry['id']}/photo",
        files={"file": ("foto.jpg", io.BytesIO(FAKE_JPEG), "image/jpeg")},
    )
    photo_id = upload_resp.json()["id"]

    # Delete
    resp = await async_client.delete(
        f"/api/v1/milestones/{entry['id']}/photo/{photo_id}"
    )
    assert resp.status_code == 204


@pytest.mark.anyio
async def test_delete_photo_not_found(async_client):
    """DELETE /api/v1/milestones/{id}/photo/{photo_id} returns 404 for missing."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    entry = await _create_milestone(async_client, child_id, cat["id"])

    resp = await async_client.delete(
        f"/api/v1/milestones/{entry['id']}/photo/9999"
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 6. Leaps (4 Tests)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_list_leap_definitions(async_client, async_session):
    """GET /api/v1/leaps/ returns all leap definitions."""
    await _insert_leap(async_session, leap_number=1, sort_order=1)
    await _insert_leap(
        async_session,
        leap_number=2,
        title="Sprung 2 — Beziehungen",
        description="Beziehungen erkennen.",
        storm_start_weeks=7.5,
        storm_end_weeks=8.5,
        sun_start_weeks=9.0,
        sort_order=2,
    )

    resp = await async_client.get("/api/v1/leaps/")
    assert resp.status_code == 200
    leaps = resp.json()
    assert len(leaps) == 2
    assert leaps[0]["leap_number"] == 1
    assert leaps[1]["leap_number"] == 2


@pytest.mark.anyio
async def test_get_leap_status_for_child(async_client, async_session):
    """GET /api/v1/leaps/status?child_id= returns computed status."""
    child_id = await _create_child(async_client, birth_date="2025-06-01")
    await _insert_leap(async_session)

    resp = await async_client.get(f"/api/v1/leaps/status?child_id={child_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "child_age_weeks" in data
    assert "reference_date" in data
    assert "leaps" in data
    assert len(data["leaps"]) == 1
    assert data["leaps"][0]["status"] in (
        "past", "active_storm", "active_sun", "upcoming", "far_future"
    )


@pytest.mark.anyio
async def test_leap_status_uses_estimated_birth_date_for_preterm(async_client, async_session):
    """Leap status uses estimated_birth_date as reference for preterm babies."""
    child_id = await _create_child(
        async_client,
        birth_date="2025-05-01",
        estimated_birth_date="2025-06-15",
        is_preterm=True,
    )
    await _insert_leap(async_session)

    resp = await async_client.get(f"/api/v1/leaps/status?child_id={child_id}")
    assert resp.status_code == 200
    data = resp.json()
    # Reference date should be the estimated birth date for preterm
    assert data["reference_date"] == "2025-06-15"


@pytest.mark.anyio
async def test_leap_status_child_not_found(async_client):
    """GET /api/v1/leaps/status?child_id=9999 returns 404."""
    resp = await async_client.get("/api/v1/leaps/status?child_id=9999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 7. Plugin Discovery (2 Tests)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_milestones_plugin_discovered():
    """MilestonesPlugin is discovered by the registry."""
    from app.plugins.registry import PluginRegistry

    registry = PluginRegistry()
    discovered = registry.discover()
    names = [p.name for p in discovered]
    assert "milestones" in names


@pytest.mark.anyio
async def test_milestones_plugin_widgets():
    """MilestonesPlugin exposes a milestones_overview widget."""
    from app.plugins.milestones import MilestonesPlugin

    plugin = MilestonesPlugin()
    widgets = plugin.register_widgets()
    assert len(widgets) == 1
    assert widgets[0].name == "milestones_overview"
    assert widgets[0].size == "medium"


# ---------------------------------------------------------------------------
# 8. Validation (3 Tests)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_title_too_long(async_client):
    """POST /api/v1/milestones/ rejects title > 200 chars (422)."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)

    resp = await async_client.post(
        "/api/v1/milestones/",
        json={
            "child_id": child_id,
            "category_id": cat["id"],
            "title": "x" * 201,
            "source_type": "custom",
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_notes_too_long(async_client):
    """POST /api/v1/milestones/ rejects notes > 2000 chars (422)."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)

    resp = await async_client.post(
        "/api/v1/milestones/",
        json={
            "child_id": child_id,
            "category_id": cat["id"],
            "title": "Test",
            "source_type": "custom",
            "notes": "x" * 2001,
        },
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_invalid_source_type(async_client):
    """POST /api/v1/milestones/ rejects unknown source_type (422)."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)

    resp = await async_client.post(
        "/api/v1/milestones/",
        json={
            "child_id": child_id,
            "category_id": cat["id"],
            "title": "Test",
            "source_type": "unknown_type",
        },
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 9. Date Range Filters (2 Bonus Tests)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_list_entries_filter_by_date_from(async_client):
    """GET /api/v1/milestones/?date_from= filters by completed_date."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    await _create_milestone(
        async_client, child_id, cat["id"],
        title="A", completed=True, completed_date="2026-03-01",
    )
    await _create_milestone(
        async_client, child_id, cat["id"],
        title="B", completed=True, completed_date="2026-04-15",
    )

    resp = await async_client.get("/api/v1/milestones/?date_from=2026-04-01")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["title"] == "B"


@pytest.mark.anyio
async def test_list_entries_filter_by_date_to(async_client):
    """GET /api/v1/milestones/?date_to= filters by completed_date."""
    child_id = await _create_child(async_client)
    cat = await _create_category(async_client, child_id)
    await _create_milestone(
        async_client, child_id, cat["id"],
        title="A", completed=True, completed_date="2026-03-01",
    )
    await _create_milestone(
        async_client, child_id, cat["id"],
        title="B", completed=True, completed_date="2026-04-15",
    )

    resp = await async_client.get("/api/v1/milestones/?date_to=2026-03-31")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["title"] == "A"
