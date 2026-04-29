"""Move breastfeeding_enabled from user_preferences to children (MBT-175).

For each existing child, set breastfeeding_enabled based on the most permissive
existing user_preferences row (any user with breastfeeding_enabled=true → child
gets true; otherwise default true). children.breastfeeding_enabled defaults to
true so children created without an existing user_preferences row inherit the
existing default behavior.

Revision ID: z7a8b9c0d1e2
Revises: y6z7a8b9c0d1
Create Date: 2026-04-29
"""

from alembic import op
import sqlalchemy as sa


revision = "z7a8b9c0d1e2"
down_revision = "y6z7a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Add children.breastfeeding_enabled (default true keeps existing behavior)
    children_columns = [col["name"] for col in inspector.get_columns("children")]
    if "breastfeeding_enabled" not in children_columns:
        with op.batch_alter_table("children") as batch_op:
            batch_op.add_column(
                sa.Column(
                    "breastfeeding_enabled",
                    sa.Boolean(),
                    nullable=False,
                    server_default="1",
                )
            )

    # 2. Migrate data: if ANY user_preferences row has breastfeeding_enabled=false,
    #    we cannot tell which child it referred to (no FK), so we keep the safer
    #    default (true). If ALL users had breastfeeding_enabled=false, set all
    #    children to false.
    if "user_preferences" in inspector.get_table_names():
        prefs_columns = [
            col["name"] for col in inspector.get_columns("user_preferences")
        ]
        if "breastfeeding_enabled" in prefs_columns:
            row = conn.execute(
                sa.text(
                    "SELECT "
                    "  COUNT(*) AS total, "
                    "  SUM(CASE WHEN breastfeeding_enabled THEN 1 ELSE 0 END) AS enabled_count "
                    "FROM user_preferences"
                )
            ).fetchone()
            if row is not None:
                total = row[0] or 0
                enabled_count = row[1] or 0
                if total > 0 and enabled_count == 0:
                    # All users had breastfeeding off → mirror to children
                    conn.execute(
                        sa.text("UPDATE children SET breastfeeding_enabled = 0")
                    )
                # else: keep default true (backwards compatible — Acceptance #3)

            # 3. Drop column from user_preferences (SQLite needs batch_alter_table)
            with op.batch_alter_table("user_preferences") as batch_op:
                batch_op.drop_column("breastfeeding_enabled")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Re-add user_preferences.breastfeeding_enabled
    if "user_preferences" in inspector.get_table_names():
        prefs_columns = [
            col["name"] for col in inspector.get_columns("user_preferences")
        ]
        if "breastfeeding_enabled" not in prefs_columns:
            with op.batch_alter_table("user_preferences") as batch_op:
                batch_op.add_column(
                    sa.Column(
                        "breastfeeding_enabled",
                        sa.Boolean(),
                        nullable=False,
                        server_default="1",
                    )
                )

    # 2. Drop children.breastfeeding_enabled
    children_columns = [col["name"] for col in inspector.get_columns("children")]
    if "breastfeeding_enabled" in children_columns:
        with op.batch_alter_table("children") as batch_op:
            batch_op.drop_column("breastfeeding_enabled")
