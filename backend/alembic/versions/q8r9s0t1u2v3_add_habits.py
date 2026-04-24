"""Add habits and habit_completions tables.

Revision ID: q8r9s0t1u2v3
Revises: p7q8r9s0t1u2
Create Date: 2026-04-24
"""

import sqlalchemy as sa
from alembic import op

revision = "q8r9s0t1u2v3"
down_revision = "p7q8r9s0t1u2"


def upgrade() -> None:
    op.create_table(
        "habits",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("child_id", sa.Integer, sa.ForeignKey("children.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("details", sa.Text, nullable=True),
        sa.Column("recurrence", sa.String(10), nullable=False, server_default="daily"),
        sa.Column("weekdays", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_habits_child_id", "habits", ["child_id"])

    op.create_table(
        "habit_completions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("habit_id", sa.Integer, sa.ForeignKey("habits.id", ondelete="CASCADE"), nullable=False),
        sa.Column("child_id", sa.Integer, sa.ForeignKey("children.id", ondelete="CASCADE"), nullable=False),
        sa.Column("completed_date", sa.Date, nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_habit_completions_habit_id", "habit_completions", ["habit_id"])
    op.create_index("ix_habit_completions_child_date", "habit_completions", ["child_id", "completed_date"])


def downgrade() -> None:
    op.drop_index("ix_habit_completions_child_date", "habit_completions")
    op.drop_index("ix_habit_completions_habit_id", "habit_completions")
    op.drop_table("habit_completions")
    op.drop_index("ix_habits_child_id", "habits")
    op.drop_table("habits")
