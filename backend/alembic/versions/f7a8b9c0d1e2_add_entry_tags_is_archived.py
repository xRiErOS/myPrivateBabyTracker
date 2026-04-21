"""add_entry_tags_is_archived

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-04-21 18:30:00.000000

Adds is_archived column to entry_tags for archiving tagged entries.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'entry_tags',
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='0')
    )


def downgrade() -> None:
    op.drop_column('entry_tags', 'is_archived')
