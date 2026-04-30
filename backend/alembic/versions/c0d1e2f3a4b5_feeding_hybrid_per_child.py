"""Move feeding_hybrid from user_preferences to children.

Analog zu MBT-175 (breastfeeding_enabled): Hybridmodus wandert vom User auf
das Kind. Wenn IRGENDEIN user_preferences-Eintrag feeding_hybrid=true hatte,
übernehmen wir true für ALLE Kinder (sicherer Default — Hybrid blendet beide
Kachel-Sets ein, niemand verliert Sichtbarkeit). Andernfalls Default false.

Revision ID: c0d1e2f3a4b5
Revises: b9c0d1e2f3a4
Create Date: 2026-04-30
"""

from alembic import op
import sqlalchemy as sa


revision = "c0d1e2f3a4b5"
down_revision = "b9c0d1e2f3a4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. children.feeding_hybrid hinzufügen
    children_columns = [col["name"] for col in inspector.get_columns("children")]
    if "feeding_hybrid" not in children_columns:
        with op.batch_alter_table("children") as batch_op:
            batch_op.add_column(
                sa.Column(
                    "feeding_hybrid",
                    sa.Boolean(),
                    nullable=False,
                    server_default="0",
                )
            )

    # 2. Daten übernehmen — wenn IRGENDEIN User Hybrid an hatte,
    #    setzen wir alle Kinder auf true.
    if "user_preferences" in inspector.get_table_names():
        prefs_columns = [
            col["name"] for col in inspector.get_columns("user_preferences")
        ]
        if "feeding_hybrid" in prefs_columns:
            row = conn.execute(
                sa.text(
                    "SELECT SUM(CASE WHEN feeding_hybrid THEN 1 ELSE 0 END) "
                    "FROM user_preferences"
                )
            ).fetchone()
            enabled_count = (row[0] if row is not None else 0) or 0
            if enabled_count > 0:
                conn.execute(
                    sa.text("UPDATE children SET feeding_hybrid = 1")
                )

            # 3. Spalte aus user_preferences entfernen
            with op.batch_alter_table("user_preferences") as batch_op:
                batch_op.drop_column("feeding_hybrid")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. user_preferences.feeding_hybrid wieder anlegen
    if "user_preferences" in inspector.get_table_names():
        prefs_columns = [
            col["name"] for col in inspector.get_columns("user_preferences")
        ]
        if "feeding_hybrid" not in prefs_columns:
            with op.batch_alter_table("user_preferences") as batch_op:
                batch_op.add_column(
                    sa.Column(
                        "feeding_hybrid",
                        sa.Boolean(),
                        nullable=False,
                        server_default="0",
                    )
                )

    # 2. children.feeding_hybrid entfernen
    children_columns = [col["name"] for col in inspector.get_columns("children")]
    if "feeding_hybrid" in children_columns:
        with op.batch_alter_table("children") as batch_op:
            batch_op.drop_column("feeding_hybrid")
