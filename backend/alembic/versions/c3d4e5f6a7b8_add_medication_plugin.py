"""add medication plugin table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-20 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "medication_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("child_id", sa.Integer(), nullable=False),
        sa.Column("given_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("medication_name", sa.String(200), nullable=False),
        sa.Column("dose", sa.String(100), nullable=True),
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
    op.create_index("ix_medication_entries_child_id", "medication_entries", ["child_id"])
    op.create_index("ix_medication_entries_given_at", "medication_entries", ["given_at"])
    op.create_index(
        "ix_medication_entries_child_given",
        "medication_entries",
        ["child_id", "given_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_medication_entries_child_given", table_name="medication_entries")
    op.drop_index("ix_medication_entries_given_at", table_name="medication_entries")
    op.drop_index("ix_medication_entries_child_id", table_name="medication_entries")
    op.drop_table("medication_entries")
