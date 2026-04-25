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
    with op.batch_alter_table("health_entries") as batch_op:
        batch_op.add_column(
            sa.Column("feeding_id", sa.Integer(), nullable=True),
        )
        batch_op.create_foreign_key(
            "fk_health_entries_feeding_id",
            "feeding_entries",
            ["feeding_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_health_entries_feeding_id", ["feeding_id"]
        )


def downgrade() -> None:
    with op.batch_alter_table("health_entries") as batch_op:
        batch_op.drop_index("ix_health_entries_feeding_id")
        batch_op.drop_constraint(
            "fk_health_entries_feeding_id", type_="foreignkey"
        )
        batch_op.drop_column("feeding_id")
