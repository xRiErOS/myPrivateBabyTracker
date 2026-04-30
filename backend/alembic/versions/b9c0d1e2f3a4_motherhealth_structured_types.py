"""MotherHealth strukturierte Eintragstypen (lochia, pain, mood, note).

Erweitert mother_health_entries:
- entry_type Discriminator (default 'note' für Bestandseinträge)
- content -> notes (rename, nullable)
- 4 lochia_* Spalten (Wochenfluss)
- 4 pain_* Spalten (VAS 0–10)
- 4 mood/wellbeing/exhaustion/activity_level Spalten (Stimmung)

Revision ID: b9c0d1e2f3a4
Revises: a8b9c0d1e2f3
Create Date: 2026-04-29
"""

from alembic import op
import sqlalchemy as sa


revision = "b9c0d1e2f3a4"
down_revision = "a8b9c0d1e2f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("mother_health_entries") as batch:
        batch.add_column(
            sa.Column(
                "entry_type",
                sa.String(20),
                nullable=False,
                server_default="note",
            )
        )
        batch.alter_column(
            "content",
            new_column_name="notes",
            existing_type=sa.Text(),
            nullable=True,
        )
        # Lochia (Wochenfluss)
        batch.add_column(sa.Column("lochia_amount", sa.String(10), nullable=True))
        batch.add_column(sa.Column("lochia_color", sa.String(10), nullable=True))
        batch.add_column(sa.Column("lochia_smell", sa.String(10), nullable=True))
        batch.add_column(sa.Column("lochia_clots", sa.Boolean(), nullable=True))
        # Pain (VAS REAL 0.0–10.0)
        batch.add_column(sa.Column("pain_perineum", sa.Float(), nullable=True))
        batch.add_column(sa.Column("pain_abdominal", sa.Float(), nullable=True))
        batch.add_column(sa.Column("pain_breast", sa.Float(), nullable=True))
        batch.add_column(sa.Column("pain_urination", sa.Float(), nullable=True))
        # Mood (Stimmung)
        batch.add_column(sa.Column("mood_level", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("wellbeing", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("exhaustion", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("activity_level", sa.String(10), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("mother_health_entries") as batch:
        # Mood
        batch.drop_column("activity_level")
        batch.drop_column("exhaustion")
        batch.drop_column("wellbeing")
        batch.drop_column("mood_level")
        # Pain
        batch.drop_column("pain_urination")
        batch.drop_column("pain_breast")
        batch.drop_column("pain_abdominal")
        batch.drop_column("pain_perineum")
        # Lochia
        batch.drop_column("lochia_clots")
        batch.drop_column("lochia_smell")
        batch.drop_column("lochia_color")
        batch.drop_column("lochia_amount")
        # Rename notes -> content (Original-Spalte war NOT NULL)
        batch.alter_column(
            "notes",
            new_column_name="content",
            existing_type=sa.Text(),
            nullable=False,
        )
        batch.drop_column("entry_type")
