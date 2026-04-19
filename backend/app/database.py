"""SQLAlchemy async engine and session factory.

Uses aiosqlite for async SQLite access. WAL mode and foreign keys
are enabled on every connection via SQLAlchemy events.
"""

from collections.abc import AsyncGenerator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
_engine = None
_session_factory = None


def init_db(database_url: str) -> None:
    """Initialize the async database engine and enable WAL mode for SQLite.

    Args:
        database_url: SQLAlchemy connection string (e.g. sqlite:///data/mybaby.db).
            Automatically converted to async variant (sqlite+aiosqlite:///).
    """
    global _engine, _session_factory

    # Convert sqlite:// to sqlite+aiosqlite:// for async
    if database_url.startswith("sqlite:///"):
        async_url = database_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    else:
        async_url = database_url

    _engine = create_async_engine(async_url, echo=False)
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)

    # Enable WAL mode and foreign keys for SQLite
    if "sqlite" in database_url:

        @event.listens_for(_engine.sync_engine, "connect")
        def _set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield a database session for FastAPI dependency injection.

    Usage:
        @app.get("/items")
        async def list_items(db: AsyncSession = Depends(get_session)):
            ...
    """
    if _session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    async with _session_factory() as session:
        yield session


def get_engine():
    """Return the current async engine."""
    return _engine


async def dispose_engine() -> None:
    """Dispose engine on shutdown. Runs WAL checkpoint for SQLite file DBs."""
    global _engine, _session_factory
    if _engine is not None:
        # WAL checkpoint before shutdown for data integrity (skip for in-memory)
        url_str = str(_engine.url)
        if "sqlite" in url_str and ":memory:" not in url_str and url_str != "sqlite+aiosqlite:///":
            try:
                async with _engine.begin() as conn:
                    await conn.execute(text("PRAGMA wal_checkpoint(TRUNCATE)"))
            except Exception:
                pass  # Best-effort checkpoint
        await _engine.dispose()
        _engine = None
        _session_factory = None
