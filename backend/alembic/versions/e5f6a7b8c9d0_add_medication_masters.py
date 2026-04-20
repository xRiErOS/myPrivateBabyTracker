"""Add medication_masters table and FK in medication_entries.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-20
"""

from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create medication_masters table
    op.create_table(
        "medication_masters",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("active_ingredient", sa.String(200), nullable=True),
        sa.Column("default_unit", sa.String(50), nullable=False, server_default="Tablette"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # Add optional FK from medication_entries to medication_masters
    with op.batch_alter_table("medication_entries") as batch_op:
        batch_op.add_column(
            sa.Column("medication_master_id", sa.Integer(), nullable=True)
        )
        batch_op.create_foreign_key(
            "fk_medication_entries_master",
            "medication_masters",
            ["medication_master_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("medication_entries") as batch_op:
        batch_op.drop_constraint("fk_medication_entries_master", type_="foreignkey")
        batch_op.drop_column("medication_master_id")

    op.drop_table("medication_masters")
