#!/usr/bin/env python3
"""
Migration Runner für MyBaby PO-Dashboard v2.
Idempotenter Runner via schema_migrations-Tabelle.
"""

import sqlite3
import os
import shutil
import datetime
import glob

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "project.db")
MIGRATIONS_DIR = os.path.join(BASE_DIR, "data", "migrations")
SCHEMA_PATH = os.path.join(BASE_DIR, "data", "schema.sql")


def backup_db():
    ts = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    backup_path = f"{DB_PATH}.bak.{ts}"
    shutil.copy2(DB_PATH, backup_path)
    print(f"[backup] {backup_path}")
    return backup_path


def is_applied(conn, version):
    row = conn.execute(
        "SELECT 1 FROM schema_migrations WHERE version = ?", (version,)
    ).fetchone()
    return row is not None


def mark_applied(conn, version):
    conn.execute(
        "INSERT INTO schema_migrations (version) VALUES (?)", (version,)
    )


def run_sql_migration(conn, filepath):
    version = os.path.basename(filepath)
    if is_applied(conn, version):
        print(f"[skip]  {version} (bereits angewendet)")
        return False
    with open(filepath, "r") as f:
        sql = f.read()
    # SQLite kann kein executescript() in einer offenen Transaktion gut handhaben,
    # daher Statement-weise via execute() nach split
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    with conn:
        for stmt in statements:
            conn.execute(stmt)
        mark_applied(conn, version)
    print(f"[apply] {version}")
    return True


def run_type_mapping(conn):
    version = "002_type_mapping"
    if is_applied(conn, version):
        print(f"[skip]  {version} (bereits angewendet)")
        return
    mapping = {
        "bug":         "bug",
        "fix":         "bug",
        "feature":     "feature",
        "enhancement": "improvement",
        "refactor":    "core",
        "chore":       "core",
        "security":    "core",
        "test":        "core",
    }
    with conn:
        for old, new in mapping.items():
            conn.execute(
                "UPDATE backlog SET type = ? WHERE type = ?", (new, old)
            )
        mark_applied(conn, version)
    print(f"[apply] {version}")


def run_status_mapping(conn):
    version = "003_status_mapping"
    if is_applied(conn, version):
        print(f"[skip]  {version} (bereits angewendet)")
        return
    with conn:
        # open + beschreibung lang ODER sprint zugewiesen → refined
        conn.execute("""
            UPDATE backlog SET status = 'refined'
            WHERE status = 'open'
              AND (length(description) >= 50 OR assigned_sprint IS NOT NULL)
        """)
        # open (Rest) → new
        conn.execute("""
            UPDATE backlog SET status = 'new'
            WHERE status = 'open'
        """)
        # in_progress bleibt
        # done + closed → done
        conn.execute("""
            UPDATE backlog SET status = 'done'
            WHERE status = 'closed'
        """)
        # blocked → refined
        conn.execute("""
            UPDATE backlog SET status = 'refined'
            WHERE status = 'blocked'
        """)
        # deferred + wont_fix → cancelled
        conn.execute("""
            UPDATE backlog SET status = 'cancelled'
            WHERE status IN ('deferred', 'wont_fix')
        """)
        mark_applied(conn, version)
    print(f"[apply] {version}")


def run_sprint_position_bootstrap(conn):
    version = "004_sprint_position"
    if is_applied(conn, version):
        print(f"[skip]  {version} (bereits angewendet)")
        return
    with conn:
        conn.execute("UPDATE sprints SET position = id WHERE position IS NULL")
        mark_applied(conn, version)
    print(f"[apply] {version}")


def run_review_rounds_bootstrap(conn):
    version = "005_review_rounds_bootstrap"
    if is_applied(conn, version):
        print(f"[skip]  {version} (bereits angewendet)")
        return
    with conn:
        conn.execute(
            "UPDATE review_feedback SET round_number = 1 WHERE round_number IS NULL"
        )
        mark_applied(conn, version)
    print(f"[apply] {version}")


def regenerate_schema(conn):
    lines = []
    for line in conn.iterdump():
        lines.append(line)
    with open(SCHEMA_PATH, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"[schema] {SCHEMA_PATH} regeneriert ({len(lines)} Zeilen)")


def print_distribution(conn):
    print("\n--- Status-Verteilung (backlog) ---")
    for row in conn.execute(
        "SELECT status, COUNT(*) as cnt FROM backlog GROUP BY status ORDER BY cnt DESC"
    ):
        print(f"  {row[0]:20s} {row[1]}")

    print("\n--- Type-Verteilung (backlog) ---")
    for row in conn.execute(
        "SELECT type, COUNT(*) as cnt FROM backlog GROUP BY type ORDER BY cnt DESC"
    ):
        print(f"  {row[0]:20s} {row[1]}")


def main():
    print(f"DB: {DB_PATH}")
    backup_path = backup_db()

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")

    # schema_migrations Tabelle anlegen falls nicht existent
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()

    # SQL-Migrations-Dateien in alphabetischer Reihenfolge
    applied_count = 0
    migration_files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    for filepath in migration_files:
        if run_sql_migration(conn, filepath):
            applied_count += 1

    # One-Off Datenmigrations
    run_type_mapping(conn)
    run_status_mapping(conn)
    run_sprint_position_bootstrap(conn)
    run_review_rounds_bootstrap(conn)

    # Schema-Dump regenerieren
    regenerate_schema(conn)

    print(f"\n[done] {applied_count} SQL-Migration(en) angewendet.")
    print(f"[backup] {backup_path}")

    print_distribution(conn)

    # Smoke-Test Queries
    print("\n--- Smoke-Tests ---")
    cnt = conn.execute("SELECT COUNT(*) FROM issue_dependencies").fetchone()[0]
    print(f"  issue_dependencies rows: {cnt}")
    cnt = conn.execute("SELECT COUNT(*) FROM archon_runs").fetchone()[0]
    print(f"  archon_runs rows:        {cnt}")

    print("\n--- schema_migrations ---")
    for row in conn.execute(
        "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at"
    ):
        print(f"  {row[0]:40s} {row[1]}")

    print("\n--- backlog neue Spalten (LIMIT 3) ---")
    for row in conn.execute(
        "SELECT id, plugin_key, goal, background FROM backlog LIMIT 3"
    ):
        print(f"  id={row[0]}  plugin_key={row[1]}  goal={row[2]}  background={row[3]}")

    print("\n--- sprints position (LIMIT 5) ---")
    for row in conn.execute("SELECT id, position FROM sprints LIMIT 5"):
        print(f"  sprint_id={row[0]}  position={row[1]}")

    conn.close()


if __name__ == "__main__":
    main()
