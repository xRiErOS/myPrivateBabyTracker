"""Add checkup_types and checkup_entries tables + seed U1-U9.

Revision ID: t1u2v3w4x5y6
Revises: r9s0t1u2v3w4
Create Date: 2026-04-24
"""

from alembic import op
import sqlalchemy as sa


revision = "t1u2v3w4x5y6"
down_revision = "r9s0t1u2v3w4"
branch_labels = None
depends_on = None

# Seed data: U1-U9
CHECKUP_TYPES = [
    ("U1", "U1 — direkt nach Geburt", 0, 0,
     "Erste Untersuchung direkt nach der Geburt. APGAR-Score, Vitalzeichen."),
    ("U2", "U2 — 3. bis 10. Lebenstag", 0, 2,
     "Neugeborenen-Basisuntersuchung. Bluttest, Hoerscreening."),
    ("U3", "U3 — 4. bis 5. Lebenswoche", 4, 5,
     "Hueftgelenk-Ultraschall, Entwicklungskontrolle."),
    ("U4", "U4 — 3. bis 4. Lebensmonat", 12, 17,
     "Motorik, Reaktionen, Impfberatung."),
    ("U5", "U5 — 6. bis 7. Lebensmonat", 26, 30,
     "Sehvermoegen, Greifen, Brabbeln."),
    ("U6", "U6 — 10. bis 12. Lebensmonat", 43, 52,
     "Krabbeln, Hochziehen, Sprachentwicklung."),
    ("U7", "U7 — 21. bis 24. Lebensmonat", 91, 104,
     "Laufen, Sprechen, Sozialverhalten."),
    ("U7a", "U7a — 34. bis 36. Lebensmonat", 147, 156,
     "Sehtest, Sprachentwicklung, allergische Erkrankungen."),
    ("U8", "U8 — 46. bis 48. Lebensmonat", 199, 208,
     "Koordination, Sozialverhalten, Hoertest."),
    ("U9", "U9 — 60. bis 64. Lebensmonat", 260, 278,
     "Schulreife-Untersuchung, Motorik, Kognition."),
]


def upgrade() -> None:
    # Create checkup_types table
    op.create_table(
        "checkup_types",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(10), nullable=False, unique=True),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("recommended_age_weeks_min", sa.Integer(), nullable=False),
        sa.Column("recommended_age_weeks_max", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
    )

    # Create checkup_entries table
    op.create_table(
        "checkup_entries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "child_id",
            sa.Integer(),
            sa.ForeignKey("children.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "checkup_type_id",
            sa.Integer(),
            sa.ForeignKey("checkup_types.id"),
            nullable=False,
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("doctor", sa.String(200), nullable=True),
        sa.Column("weight_grams", sa.Integer(), nullable=True),
        sa.Column("height_cm", sa.Float(), nullable=True),
        sa.Column("head_circumference_cm", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index("ix_checkup_entries_child_id", "checkup_entries", ["child_id"])
    op.create_index(
        "ix_checkup_entries_child_type",
        "checkup_entries",
        ["child_id", "checkup_type_id"],
    )

    # Seed checkup types
    checkup_types_table = sa.table(
        "checkup_types",
        sa.column("name", sa.String),
        sa.column("display_name", sa.String),
        sa.column("recommended_age_weeks_min", sa.Integer),
        sa.column("recommended_age_weeks_max", sa.Integer),
        sa.column("description", sa.Text),
    )

    op.bulk_insert(
        checkup_types_table,
        [
            {
                "name": name,
                "display_name": display_name,
                "recommended_age_weeks_min": min_w,
                "recommended_age_weeks_max": max_w,
                "description": desc,
            }
            for name, display_name, min_w, max_w, desc in CHECKUP_TYPES
        ],
    )


def downgrade() -> None:
    op.drop_table("checkup_entries")
    op.drop_table("checkup_types")
