"""Add duration_minutes and soothing_method to health_entries for crying tracking.

Revision ID: u2v3w4x5y6z7
Revises: t1u2v3w4x5y6
Create Date: 2026-04-24
"""

from alembic import op
import sqlalchemy as sa


revision = "u2v3w4x5y6z7"
down_revision = "t1u2v3w4x5y6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("health_entries") as batch_op:
        batch_op.add_column(
            sa.Column("duration_minutes", sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("soothing_method", sa.String(20), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("health_entries") as batch_op:
        batch_op.drop_column("soothing_method")
        batch_op.drop_column("duration_minutes")
