"""seed_milestones_data

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-04-21 14:40:00.000000

Inserts seed data: 8 system categories, ~107 milestone templates, 10 leap definitions.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.plugins.milestones.seed_data import (
        LEAP_DEFINITIONS,
        MILESTONE_TEMPLATES,
        SYSTEM_CATEGORIES,
    )

    # 1. Insert system categories
    categories_table = sa.table(
        'milestone_categories',
        sa.column('id', sa.Integer),
        sa.column('name', sa.String),
        sa.column('color', sa.String),
        sa.column('icon', sa.String),
        sa.column('is_system', sa.Boolean),
        sa.column('child_id', sa.Integer),
    )

    cat_rows = []
    for i, cat in enumerate(SYSTEM_CATEGORIES, start=1):
        cat_rows.append({
            'id': i,
            'name': cat['name'],
            'color': cat['color'],
            'icon': cat['icon'],
            'is_system': True,
            'child_id': None,
        })
    op.bulk_insert(categories_table, cat_rows)

    # Build name → id map for templates
    cat_name_to_id = {cat['name']: i for i, cat in enumerate(SYSTEM_CATEGORIES, start=1)}

    # 2. Insert milestone templates
    templates_table = sa.table(
        'milestone_templates',
        sa.column('title', sa.String),
        sa.column('description', sa.Text),
        sa.column('category_id', sa.Integer),
        sa.column('source_type', sa.String),
        sa.column('suggested_age_weeks_min', sa.Integer),
        sa.column('suggested_age_weeks_max', sa.Integer),
        sa.column('sort_order', sa.Integer),
    )

    tmpl_rows = []
    for t in MILESTONE_TEMPLATES:
        tmpl_rows.append({
            'title': t['title'],
            'description': t.get('description'),
            'category_id': cat_name_to_id[t['category']],
            'source_type': t['source_type'],
            'suggested_age_weeks_min': t.get('suggested_age_weeks_min'),
            'suggested_age_weeks_max': t.get('suggested_age_weeks_max'),
            'sort_order': t.get('sort_order', 0),
        })
    op.bulk_insert(templates_table, tmpl_rows)

    # 3. Insert leap definitions
    leaps_table = sa.table(
        'leap_definitions',
        sa.column('leap_number', sa.Integer),
        sa.column('title', sa.String),
        sa.column('description', sa.Text),
        sa.column('storm_start_weeks', sa.Float),
        sa.column('storm_end_weeks', sa.Float),
        sa.column('sun_start_weeks', sa.Float),
        sa.column('new_skills', sa.Text),
        sa.column('storm_signs', sa.Text),
        sa.column('sort_order', sa.Integer),
    )

    leap_rows = []
    for leap in LEAP_DEFINITIONS:
        leap_rows.append({
            'leap_number': leap['leap_number'],
            'title': leap['title'],
            'description': leap['description'],
            'storm_start_weeks': leap['storm_start_weeks'],
            'storm_end_weeks': leap['storm_end_weeks'],
            'sun_start_weeks': leap['sun_start_weeks'],
            'new_skills': leap['new_skills'],
            'storm_signs': leap['storm_signs'],
            'sort_order': leap.get('sort_order', 0),
        })
    op.bulk_insert(leaps_table, leap_rows)


def downgrade() -> None:
    # Remove all seed data
    op.execute("DELETE FROM milestone_templates WHERE 1=1")
    op.execute("DELETE FROM leap_definitions WHERE 1=1")
    op.execute("DELETE FROM milestone_categories WHERE is_system = 1")
