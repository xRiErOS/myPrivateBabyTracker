"""Remove consistency field from diaper_entries.

User feedback: Notizfeld reicht, Konsistenz-Dropdown unnoetig.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-20
"""

from alembic import op
import sqlalchemy as sa

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("diaper_entries") as batch_op:
        batch_op.drop_column("consistency")


def downgrade() -> None:
    with op.batch_alter_table("diaper_entries") as batch_op:
        batch_op.add_column(sa.Column("consistency", sa.String(30), nullable=True))
