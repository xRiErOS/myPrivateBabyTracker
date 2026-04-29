"""Add birth_weight_g and birth_length_cm to children for MBT-206.

Revision ID: x5y6z7a8b9c0
Revises: w4x5y6z7a8b9
Create Date: 2026-04-29
"""

from alembic import op
import sqlalchemy as sa


revision = "x5y6z7a8b9c0"
down_revision = "w4x5y6z7a8b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    columns = [col["name"] for col in sa.inspect(conn).get_columns("children")]
    with op.batch_alter_table("children") as batch_op:
        if "birth_weight_g" not in columns:
            batch_op.add_column(sa.Column("birth_weight_g", sa.Integer(), nullable=True))
        if "birth_length_cm" not in columns:
            batch_op.add_column(sa.Column("birth_length_cm", sa.Numeric(5, 2), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("children") as batch_op:
        batch_op.drop_column("birth_length_cm")
        batch_op.drop_column("birth_weight_g")
