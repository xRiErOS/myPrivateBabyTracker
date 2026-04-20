"""add weight plugin table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-20 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "weight_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("child_id", sa.Integer(), nullable=False),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("weight_grams", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["child_id"], ["children.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_weight_entries_child_id", "weight_entries", ["child_id"])
    op.create_index("ix_weight_entries_measured_at", "weight_entries", ["measured_at"])
    op.create_index(
        "ix_weight_entries_child_measured",
        "weight_entries",
        ["child_id", "measured_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_weight_entries_child_measured", table_name="weight_entries")
    op.drop_index("ix_weight_entries_measured_at", table_name="weight_entries")
    op.drop_index("ix_weight_entries_child_id", table_name="weight_entries")
    op.drop_table("weight_entries")
