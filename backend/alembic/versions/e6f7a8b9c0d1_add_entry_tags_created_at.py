"""add_entry_tags_created_at

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-04-21 18:00:00.000000

Adds created_at column to entry_tags for date-based sorting on TagDetailPage.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite doesn't support ALTER TABLE ADD COLUMN with non-constant defaults
    # Use a literal string default, then server_default works for new rows via model
    op.add_column(
        'entry_tags',
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("'2026-04-21T00:00:00+00:00'"), nullable=False)
    )
    # Update existing rows to current timestamp
    op.execute("UPDATE entry_tags SET created_at = datetime('now')")


def downgrade() -> None:
    op.drop_column('entry_tags', 'created_at')
