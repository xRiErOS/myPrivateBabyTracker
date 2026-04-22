"""Add feeding_hybrid to user_preferences.

Revision ID: m4n5o6p7q8r9
Revises: l3m4n5o6p7q8
Create Date: 2026-04-22
"""

from alembic import op
import sqlalchemy as sa


revision = "m4n5o6p7q8r9"
down_revision = "l3m4n5o6p7q8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column("feeding_hybrid", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("user_preferences", "feeding_hybrid")
