"""Add location field to sleep_entries for optional sleep location tracking.

Revision ID: w4x5y6z7a8b9
Revises: v3w4x5y6z7a8
Create Date: 2026-04-24
"""

from alembic import op
import sqlalchemy as sa


revision = "w4x5y6z7a8b9"
down_revision = "v3w4x5y6z7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("sleep_entries") as batch_op:
        batch_op.add_column(
            sa.Column("location", sa.String(50), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("sleep_entries") as batch_op:
        batch_op.drop_column("location")
