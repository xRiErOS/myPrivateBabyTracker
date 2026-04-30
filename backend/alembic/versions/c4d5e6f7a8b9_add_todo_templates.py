"""add_todo_templates

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-04-21 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    # Create todo_templates table (idempotent)
    if 'todo_templates' not in existing_tables:
        op.create_table(
            'todo_templates',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('child_id', sa.Integer(), sa.ForeignKey('children.id', ondelete='CASCADE'), nullable=False),
            sa.Column('title', sa.String(200), nullable=False),
            sa.Column('details', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_todo_templates_child_id', 'todo_templates', ['child_id'])

    # Add template_id FK to todo_entries (idempotent, batch for SQLite)
    existing_columns = [c['name'] for c in inspector.get_columns('todo_entries')]
    if 'template_id' not in existing_columns:
        with op.batch_alter_table('todo_entries') as batch_op:
            batch_op.add_column(
                sa.Column('template_id', sa.Integer(), nullable=True),
            )
            batch_op.create_foreign_key(
                'fk_todo_entries_template_id',
                'todo_templates',
                ['template_id'],
                ['id'],
                ondelete='SET NULL',
            )


def downgrade() -> None:
    # batch_alter_table rebuilds the table; dropping the column removes the FK with it.
    with op.batch_alter_table('todo_entries') as batch_op:
        batch_op.drop_column('template_id')
    op.drop_table('todo_templates')
