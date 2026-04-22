"""Add feeding_id FK to health_entries.

Revision ID: l3m4n5o6p7q8
Revises: k2l3m4n5o6p7
Create Date: 2026-04-22
"""

from alembic import op
import sqlalchemy as sa

revision = "l3m4n5o6p7q8"
down_revision = "k2l3m4n5o6p7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "health_entries",
        sa.Column("feeding_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_health_entries_feeding_id",
        "health_entries",
        "feeding_entries",
        ["feeding_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_health_entries_feeding_id", "health_entries", ["feeding_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_health_entries_feeding_id", table_name="health_entries")
    op.drop_constraint(
        "fk_health_entries_feeding_id", "health_entries", type_="foreignkey"
    )
    op.drop_column("health_entries", "feeding_id")
