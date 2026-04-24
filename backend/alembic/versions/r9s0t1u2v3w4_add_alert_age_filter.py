"""Add min_age_weeks and max_age_weeks to alert_configs.

Allows age-specific alert filtering: rules are only evaluated when
the child's corrected age falls within [min_age_weeks, max_age_weeks].
NULL means no lower/upper bound.

Revision ID: r9s0t1u2v3w4
Revises: q8r9s0t1u2v3
Create Date: 2026-04-24
"""

import sqlalchemy as sa
from alembic import op

revision = "r9s0t1u2v3w4"
down_revision = "q8r9s0t1u2v3"


def upgrade() -> None:
    with op.batch_alter_table("alert_configs") as batch_op:
        batch_op.add_column(sa.Column("min_age_weeks", sa.Integer, nullable=True))
        batch_op.add_column(sa.Column("max_age_weeks", sa.Integer, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("alert_configs") as batch_op:
        batch_op.drop_column("max_age_weeks")
        batch_op.drop_column("min_age_weeks")
