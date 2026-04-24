"""Change health_entries.feeding_id FK from SET NULL to CASCADE.

When a feeding entry is deleted, linked health entries (spit_up, tummy_ache)
are now also deleted instead of being orphaned with NULL feeding_id.

Revision ID: p7q8r9s0t1u2
Revises: o6p7q8r9s0t1
Create Date: 2026-04-23
"""

from alembic import op


revision = "p7q8r9s0t1u2"
down_revision = "o6p7q8r9s0t1"


def upgrade() -> None:
    with op.batch_alter_table("health_entries") as batch_op:
        try:
            batch_op.drop_constraint(
                "fk_health_entries_feeding_id", type_="foreignkey"
            )
        except Exception:
            # Constraint may not exist by this name in older DBs (SQLite FK reflection)
            pass
        batch_op.create_foreign_key(
            "fk_health_entries_feeding_id",
            "feeding_entries",
            ["feeding_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    with op.batch_alter_table("health_entries") as batch_op:
        batch_op.drop_constraint(
            "fk_health_entries_feeding_id", type_="foreignkey"
        )
        batch_op.create_foreign_key(
            "fk_health_entries_feeding_id",
            "feeding_entries",
            ["feeding_id"],
            ["id"],
            ondelete="SET NULL",
        )
