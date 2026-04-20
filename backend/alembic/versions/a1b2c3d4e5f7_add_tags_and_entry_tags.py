"""Add tags and entry_tags tables for polymorphic tagging.

Revision ID: a1b2c3d4e5f7
Revises: f6a7b8c9d0e1
Create Date: 2026-04-20
"""

from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f7"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("child_id", sa.Integer, sa.ForeignKey("children.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#8839ef"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("child_id", "name", name="uq_tag_child_name"),
    )
    op.create_index("ix_tags_child_id", "tags", ["child_id"])

    op.create_table(
        "entry_tags",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("tag_id", sa.Integer, sa.ForeignKey("tags.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entry_type", sa.String(50), nullable=False),
        sa.Column("entry_id", sa.Integer, nullable=False),
        sa.UniqueConstraint("tag_id", "entry_type", "entry_id", name="uq_entry_tag"),
    )
    op.create_index("ix_entry_tags_entry", "entry_tags", ["entry_type", "entry_id"])
    op.create_index("ix_entry_tags_tag_id", "entry_tags", ["tag_id"])


def downgrade() -> None:
    op.drop_table("entry_tags")
    op.drop_table("tags")
