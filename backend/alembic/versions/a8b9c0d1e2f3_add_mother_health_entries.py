"""Add mother_health_entries table for MBT-109 (Wochenbett / Hebammen-Notizen).

Privacy-first Freitext-Notizbuch fuer Mutter. Optionales Plugin, standardmaessig
deaktiviert. Konzeptionell zur Mutter, FK auf children fuer Konsistenz.

Revision ID: a8b9c0d1e2f3
Revises: z7a8b9c0d1e2
Create Date: 2026-04-29
"""

from alembic import op
import sqlalchemy as sa


revision = "a8b9c0d1e2f3"
down_revision = "z7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mother_health_entries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "child_id",
            sa.Integer(),
            sa.ForeignKey("children.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index(
        "ix_mother_health_entries_child_id",
        "mother_health_entries",
        ["child_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_mother_health_entries_child_id", table_name="mother_health_entries"
    )
    op.drop_table("mother_health_entries")
