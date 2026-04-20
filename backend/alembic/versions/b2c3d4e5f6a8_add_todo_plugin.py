"""Add todo_entries table for baby todo list plugin.

Revision ID: b2c3d4e5f6a8
Revises: a1b2c3d4e5f7
Create Date: 2026-04-20
"""

from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a8"
down_revision = "a1b2c3d4e5f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "todo_entries",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("child_id", sa.Integer, sa.ForeignKey("children.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("details", sa.Text, nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_done", sa.Boolean, nullable=False, server_default=sa.text("0")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_todo_entries_child_id", "todo_entries", ["child_id"])
    op.create_index("ix_todo_entries_child_done", "todo_entries", ["child_id", "is_done"])


def downgrade() -> None:
    op.drop_table("todo_entries")
