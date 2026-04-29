"""Add tutorial_completed and tutorial_step to user_preferences (MBT-170).

Revision ID: y6z7a8b9c0d1
Revises: x5y6z7a8b9c0
Create Date: 2026-04-29
"""

from alembic import op
import sqlalchemy as sa


revision = "y6z7a8b9c0d1"
down_revision = "x5y6z7a8b9c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    columns = [col["name"] for col in sa.inspect(conn).get_columns("user_preferences")]
    with op.batch_alter_table("user_preferences") as batch_op:
        if "tutorial_completed" not in columns:
            batch_op.add_column(
                sa.Column("tutorial_completed", sa.Boolean(), nullable=False, server_default="0")
            )
        if "tutorial_step" not in columns:
            batch_op.add_column(
                sa.Column("tutorial_step", sa.Integer(), nullable=False, server_default="0")
            )


def downgrade() -> None:
    with op.batch_alter_table("user_preferences") as batch_op:
        batch_op.drop_column("tutorial_step")
        batch_op.drop_column("tutorial_completed")
