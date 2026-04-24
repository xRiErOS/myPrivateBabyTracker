"""Tests for the Todo plugin CRUD API."""

import pytest
from httpx import AsyncClient


# --- Helper ---


async def _create_child(client: AsyncClient) -> int:
    resp = await client.post(
        "/api/v1/children/",
        json={"name": "Todo Test Baby", "birth_date": "2025-06-01"},
    )
    return resp.json()["id"]


async def _create_todo(client: AsyncClient, child_id: int, **kwargs) -> dict:
    payload = {"child_id": child_id, "title": "Impfung besprechen", **kwargs}
    resp = await client.post("/api/v1/todo/", json=payload)
    assert resp.status_code == 201
    return resp.json()


# --- CRUD Tests ---


@pytest.mark.anyio
async def test_create_todo(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    data = await _create_todo(async_client, child_id)
    assert data["title"] == "Impfung besprechen"
    assert data["is_done"] is False
    assert data["completed_at"] is None
    assert data["child_id"] == child_id


@pytest.mark.anyio
async def test_create_todo_with_details_and_due_date(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    data = await _create_todo(
        async_client,
        child_id,
        title="U4 Termin",
        details="Gewicht und Laenge messen",
        due_date="2026-05-01T10:00:00Z",
    )
    assert data["title"] == "U4 Termin"
    assert data["details"] == "Gewicht und Laenge messen"
    assert data["due_date"] is not None


@pytest.mark.anyio
async def test_list_todos(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    await _create_todo(async_client, child_id, title="Todo A")
    await _create_todo(async_client, child_id, title="Todo B")
    resp = await async_client.get(f"/api/v1/todo/?child_id={child_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.anyio
async def test_list_todos_hide_done(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    todo = await _create_todo(async_client, child_id, title="Done Todo")
    await _create_todo(async_client, child_id, title="Open Todo")
    # Mark first as done
    await async_client.patch(f"/api/v1/todo/{todo['id']}", json={"is_done": True})

    resp = await async_client.get(f"/api/v1/todo/?child_id={child_id}&show_done=false")
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert "Open Todo" in titles
    assert "Done Todo" not in titles


@pytest.mark.anyio
async def test_get_todo(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    todo = await _create_todo(async_client, child_id)
    resp = await async_client.get(f"/api/v1/todo/{todo['id']}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Impfung besprechen"


@pytest.mark.anyio
async def test_get_nonexistent_todo(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/todo/999")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_update_todo(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    todo = await _create_todo(async_client, child_id)
    resp = await async_client.patch(
        f"/api/v1/todo/{todo['id']}",
        json={"title": "Impfung U5", "details": "3. Monat"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Impfung U5"
    assert resp.json()["details"] == "3. Monat"


@pytest.mark.anyio
async def test_mark_todo_done_sets_completed_at(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    todo = await _create_todo(async_client, child_id)
    resp = await async_client.patch(
        f"/api/v1/todo/{todo['id']}",
        json={"is_done": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_done"] is True
    assert data["completed_at"] is not None


@pytest.mark.anyio
async def test_unmark_todo_clears_completed_at(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    todo = await _create_todo(async_client, child_id)
    await async_client.patch(f"/api/v1/todo/{todo['id']}", json={"is_done": True})
    resp = await async_client.patch(
        f"/api/v1/todo/{todo['id']}",
        json={"is_done": False},
    )
    assert resp.status_code == 200
    assert resp.json()["is_done"] is False
    assert resp.json()["completed_at"] is None


@pytest.mark.anyio
async def test_delete_todo(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    todo = await _create_todo(async_client, child_id)
    resp = await async_client.delete(f"/api/v1/todo/{todo['id']}")
    assert resp.status_code == 204
    resp = await async_client.get(f"/api/v1/todo/{todo['id']}")
    assert resp.status_code == 404


# --- Validation Tests ---


@pytest.mark.anyio
async def test_title_required(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/todo/",
        json={"child_id": child_id},
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_title_max_length(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/todo/",
        json={"child_id": child_id, "title": "x" * 201},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Habit Tests
# ---------------------------------------------------------------------------


async def _create_habit(client: AsyncClient, child_id: int, **kwargs) -> dict:
    payload = {"child_id": child_id, "title": "Spaziergang", **kwargs}
    resp = await client.post("/api/v1/habits/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.mark.anyio
async def test_create_daily_habit(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    data = await _create_habit(async_client, child_id, recurrence="daily")
    assert data["title"] == "Spaziergang"
    assert data["recurrence"] == "daily"
    assert data["streak"] == 0
    assert data["completed_today"] is False
    assert data["is_active"] is True


@pytest.mark.anyio
async def test_create_weekly_habit(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    data = await _create_habit(async_client, child_id, recurrence="weekly", weekdays=[0, 2, 4])
    assert data["recurrence"] == "weekly"
    assert data["weekdays"] == [0, 2, 4]


@pytest.mark.anyio
async def test_list_habits(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    await _create_habit(async_client, child_id, title="Habit A")
    await _create_habit(async_client, child_id, title="Habit B")
    resp = await async_client.get(f"/api/v1/habits/?child_id={child_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.anyio
async def test_complete_habit_today(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    habit = await _create_habit(async_client, child_id)
    resp = await async_client.post(f"/api/v1/habits/{habit['id']}/complete")
    assert resp.status_code == 201
    data = resp.json()
    assert data["habit_id"] == habit["id"]
    assert data["completed_date"] is not None


@pytest.mark.anyio
async def test_complete_habit_idempotent(async_client: AsyncClient):
    """Completing twice should return existing record, not 500."""
    child_id = await _create_child(async_client)
    habit = await _create_habit(async_client, child_id)
    await async_client.post(f"/api/v1/habits/{habit['id']}/complete")
    resp = await async_client.post(f"/api/v1/habits/{habit['id']}/complete")
    assert resp.status_code == 201  # returns existing, no duplicate


@pytest.mark.anyio
async def test_uncomplete_habit(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    habit = await _create_habit(async_client, child_id)
    await async_client.post(f"/api/v1/habits/{habit['id']}/complete")
    resp = await async_client.delete(f"/api/v1/habits/{habit['id']}/complete")
    assert resp.status_code == 204


@pytest.mark.anyio
async def test_habit_streak_after_completion(async_client: AsyncClient):
    """After completing today, streak should be at least 1."""
    child_id = await _create_child(async_client)
    habit = await _create_habit(async_client, child_id)
    await async_client.post(f"/api/v1/habits/{habit['id']}/complete")
    resp = await async_client.get(f"/api/v1/habits/{habit['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["streak"] >= 1
    assert data["completed_today"] is True


@pytest.mark.anyio
async def test_update_habit(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    habit = await _create_habit(async_client, child_id)
    resp = await async_client.patch(
        f"/api/v1/habits/{habit['id']}",
        json={"title": "Baden", "recurrence": "weekly", "weekdays": [1, 4, 6]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Baden"
    assert data["weekdays"] == [1, 4, 6]


@pytest.mark.anyio
async def test_delete_habit(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    habit = await _create_habit(async_client, child_id)
    resp = await async_client.delete(f"/api/v1/habits/{habit['id']}")
    assert resp.status_code == 204
    resp2 = await async_client.get(f"/api/v1/habits/{habit['id']}")
    assert resp2.status_code == 404


@pytest.mark.anyio
async def test_habit_invalid_weekday(async_client: AsyncClient):
    child_id = await _create_child(async_client)
    resp = await async_client.post(
        "/api/v1/habits/",
        json={"child_id": child_id, "title": "Test", "recurrence": "weekly", "weekdays": [7]},
    )
    assert resp.status_code == 422
