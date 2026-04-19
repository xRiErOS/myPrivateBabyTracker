"""Alembic migration environment.

Imports all models via app.models so autogenerate discovers them.
Uses synchronous SQLite driver (Alembic does not need async).
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Import all models so Alembic metadata includes them
from app.models import Base  # noqa: F401
from app.models import User, Child, ChildCaregiver  # noqa: F401

# Discover plugin models (ADR-1: filesystem scan)
from app.plugins import discover_models  # noqa: E402
discover_models()

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in offline mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        render_as_batch=True,  # Required for SQLite ALTER TABLE
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in online mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # Required for SQLite ALTER TABLE
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
