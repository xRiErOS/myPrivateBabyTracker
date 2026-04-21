"""add_milestones_plugin_tables

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-04-21 14:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # milestone_categories
    op.create_table(
        'milestone_categories',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('color', sa.String(7), nullable=False, server_default='#8839ef'),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('child_id', sa.Integer(), sa.ForeignKey('children.id', ondelete='CASCADE'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'child_id', name='uq_category_name_child'),
    )

    # milestone_templates
    op.create_table(
        'milestone_templates',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('milestone_categories.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_type', sa.String(20), nullable=False),
        sa.Column('suggested_age_weeks_min', sa.Integer(), nullable=True),
        sa.Column('suggested_age_weeks_max', sa.Integer(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_milestone_templates_category', 'milestone_templates', ['category_id'])
    op.create_index('ix_milestone_templates_source', 'milestone_templates', ['source_type'])

    # milestone_entries
    op.create_table(
        'milestone_entries',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('child_id', sa.Integer(), sa.ForeignKey('children.id', ondelete='CASCADE'), nullable=False),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('milestone_templates.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('milestone_categories.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_type', sa.String(20), nullable=False),
        sa.Column('completed', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('completed_date', sa.Date(), nullable=True),
        sa.Column('confidence', sa.String(20), nullable=False, server_default='exact'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_milestone_entries_child', 'milestone_entries', ['child_id'])
    op.create_index('ix_milestone_entries_child_completed', 'milestone_entries', ['child_id', 'completed'])
    op.create_index('ix_milestone_entries_child_category', 'milestone_entries', ['child_id', 'category_id'])
    op.create_index('ix_milestone_entries_child_date', 'milestone_entries', ['child_id', 'completed_date'])

    # milestone_photos
    op.create_table(
        'milestone_photos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('milestone_entry_id', sa.Integer(), sa.ForeignKey('milestone_entries.id', ondelete='CASCADE'), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_name', sa.String(200), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_milestone_photos_entry', 'milestone_photos', ['milestone_entry_id'])

    # leap_definitions
    op.create_table(
        'leap_definitions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('leap_number', sa.Integer(), nullable=False, unique=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('storm_start_weeks', sa.Float(), nullable=False),
        sa.Column('storm_end_weeks', sa.Float(), nullable=False),
        sa.Column('sun_start_weeks', sa.Float(), nullable=False),
        sa.Column('new_skills', sa.Text(), nullable=True),
        sa.Column('storm_signs', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('leap_definitions')
    op.drop_table('milestone_photos')
    op.drop_table('milestone_entries')
    op.drop_table('milestone_templates')
    op.drop_table('milestone_categories')
