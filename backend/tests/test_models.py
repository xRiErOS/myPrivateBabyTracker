"""Tests for core SQLAlchemy models (User, Child, ChildCaregiver, PluginState)."""

import pytest
from datetime import date, datetime, timezone
from sqlalchemy import event, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.base import Base
from app.models.user import User
from app.models.child import Child, ChildCaregiver


@pytest.fixture
async def engine():
    """In-memory async SQLite engine for testing."""
    e = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    # Enable foreign keys for SQLite (required for CASCADE)
    @event.listens_for(e.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with e.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield e
    await e.dispose()


@pytest.fixture
async def session(engine):
    """Async session bound to in-memory DB."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        yield s


@pytest.mark.anyio
async def test_create_user(session: AsyncSession):
    """User can be created with required fields."""
    user = User(
        username="testparent",
        display_name="Test Parent",
        auth_type="forward_auth",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    assert user.id is not None
    assert user.username == "testparent"
    assert user.display_name == "Test Parent"
    assert user.auth_type == "forward_auth"
    assert user.password_hash is None
    assert user.is_active is True


@pytest.mark.anyio
async def test_user_created_at_auto_set(session: AsyncSession):
    """created_at is automatically set on insert."""
    user = User(username="timetest", auth_type="local")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    assert user.created_at is not None
    # Should be roughly now (within 10 seconds)
    assert isinstance(user.created_at, datetime)


@pytest.mark.anyio
async def test_user_username_unique(session: AsyncSession):
    """Username must be unique."""
    user1 = User(username="duplicate", auth_type="forward_auth")
    user2 = User(username="duplicate", auth_type="local")
    session.add(user1)
    await session.commit()

    session.add(user2)
    with pytest.raises(IntegrityError):
        await session.commit()


@pytest.mark.anyio
async def test_user_password_hash_nullable(session: AsyncSession):
    """Forward-auth users have no password_hash."""
    user = User(username="nopass", auth_type="forward_auth")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    assert user.password_hash is None


@pytest.mark.anyio
async def test_create_child(session: AsyncSession):
    """Child can be created with required fields."""
    child = Child(
        name="Baby Emma",
        birth_date=date(2026, 1, 15),
        notes="First child",
    )
    session.add(child)
    await session.commit()
    await session.refresh(child)

    assert child.id is not None
    assert child.name == "Baby Emma"
    assert child.birth_date == date(2026, 1, 15)
    assert child.notes == "First child"
    assert child.is_active is True


@pytest.mark.anyio
async def test_child_created_at_auto_set(session: AsyncSession):
    """created_at is automatically set on insert."""
    child = Child(name="Timetest Baby", birth_date=date(2026, 3, 1))
    session.add(child)
    await session.commit()
    await session.refresh(child)

    assert child.created_at is not None


@pytest.mark.anyio
async def test_child_caregiver_link(session: AsyncSession):
    """ChildCaregiver links a user to a child."""
    user = User(username="caregiver1", auth_type="local")
    child = Child(name="Linked Baby", birth_date=date(2026, 2, 1))
    session.add_all([user, child])
    await session.commit()
    await session.refresh(user)
    await session.refresh(child)

    link = ChildCaregiver(child_id=child.id, user_id=user.id)
    session.add(link)
    await session.commit()

    result = await session.execute(
        select(ChildCaregiver).where(ChildCaregiver.child_id == child.id)
    )
    caregivers = result.scalars().all()
    assert len(caregivers) == 1
    assert caregivers[0].user_id == user.id


@pytest.mark.anyio
async def test_child_cascade_delete_caregivers(session: AsyncSession):
    """Deleting a child cascades to ChildCaregiver."""
    user = User(username="cascade_user", auth_type="local")
    child = Child(name="Cascade Baby", birth_date=date(2026, 4, 1))
    session.add_all([user, child])
    await session.commit()
    await session.refresh(user)
    await session.refresh(child)

    link = ChildCaregiver(child_id=child.id, user_id=user.id)
    session.add(link)
    await session.commit()

    await session.delete(child)
    await session.commit()

    result = await session.execute(select(ChildCaregiver))
    assert result.scalars().all() == []


@pytest.mark.anyio
async def test_user_cascade_delete_caregivers(session: AsyncSession):
    """Deleting a user cascades to ChildCaregiver."""
    user = User(username="cascade_user2", auth_type="local")
    child = Child(name="Cascade Baby2", birth_date=date(2026, 4, 1))
    session.add_all([user, child])
    await session.commit()
    await session.refresh(user)
    await session.refresh(child)

    link = ChildCaregiver(child_id=child.id, user_id=user.id)
    session.add(link)
    await session.commit()

    await session.delete(user)
    await session.commit()

    result = await session.execute(select(ChildCaregiver))
    assert result.scalars().all() == []
