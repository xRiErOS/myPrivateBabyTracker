"""add alert config table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-20 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "alert_configs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("child_id", sa.Integer(), nullable=False),
        sa.Column("wet_diaper_enabled", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("wet_diaper_min", sa.Integer(), server_default="5", nullable=False),
        sa.Column("no_stool_enabled", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("no_stool_hours", sa.Integer(), server_default="48", nullable=False),
        sa.Column("low_feeding_enabled", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("low_feeding_ml", sa.Integer(), server_default="500", nullable=False),
        sa.Column("fever_enabled", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("fever_threshold", sa.Float(), server_default="38.0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["child_id"], ["children.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("child_id", name="uq_alert_config_child"),
    )


def downgrade() -> None:
    op.drop_table("alert_configs")
