"""add_child_preterm_fields

Revision ID: a2b3c4d5e6f7
Revises: 918c43c44db8
Create Date: 2026-04-21 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = '918c43c44db8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('children', sa.Column('estimated_birth_date', sa.Date(), nullable=True))
    op.add_column('children', sa.Column('is_preterm', sa.Boolean(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('children', 'is_preterm')
    op.drop_column('children', 'estimated_birth_date')
