"""add feeding interval alert config

Revision ID: cb297eeee6a8
Revises: b2c3d4e5f6a8
Create Date: 2026-04-20 21:06:59.759286

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cb297eeee6a8'
down_revision: Union[str, None] = 'b2c3d4e5f6a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('alert_configs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('feeding_interval_enabled', sa.Boolean(), nullable=False, server_default=sa.text('0')))
        batch_op.add_column(sa.Column('feeding_interval_hours', sa.Integer(), nullable=False, server_default=sa.text('3')))


def downgrade() -> None:
    with op.batch_alter_table('alert_configs', schema=None) as batch_op:
        batch_op.drop_column('feeding_interval_hours')
        batch_op.drop_column('feeding_interval_enabled')
