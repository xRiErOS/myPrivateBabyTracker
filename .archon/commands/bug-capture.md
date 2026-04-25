---
description: "Erfasst einen Bug-Bericht in der backlog-Tabelle (type='bug', source='ai-agent')."
argument-hint: "<bug-description>"
---

# Bug Capture

Reiner Bash-Node — kein AI-Reasoning. Schreibt einen Bug-Eintrag in `data/project.db`.

## Eingabe

- `$ARGUMENTS` → Bug-Beschreibung (Freitext, kann Tool-Output enthalten)

## Aufgaben

1. Eingabe validieren — `$ARGUMENTS` darf nicht leer sein.

2. Bug-Titel ableiten — erste Zeile von `$ARGUMENTS`, max. 120 Zeichen.

3. Eintrag in der Main-Repo-DB schreiben — Schema hat **kein** `source`-Feld; Quelle als Prefix in `description` einbetten:
   ```sql
   INSERT INTO backlog (title, type, description, priority, milestone, assigned_sprint, status, created_at)
   VALUES ('<titel>', 'bug', '[Quelle: ai-agent]\n\n<volltext>', 3, NULL, NULL, 'open', datetime('now'));
   ```

4. Erzeugte ID zurückgeben und in `$ARTIFACTS_DIR/bugs/captured-bug.md` festhalten:
   ```markdown
   # Bug erfasst

   - ID: <neue id>
   - Titel: <titel>
   - Quelle: ai-agent
   - Erfasst: <iso-timestamp>

   ## Volltext
   <description>
   ```

## Bash-Implementierung (Skelett für den Workflow-Node)

```bash
# DB-Pfad via git-common-dir (Worktree-sicher)
COMMON=$(git rev-parse --git-common-dir)
case "$COMMON" in
  /*) MAIN_REPO=$(dirname "$COMMON") ;;
  *)  MAIN_REPO=$(cd "$COMMON/.." && pwd) ;;
esac
DB="$MAIN_REPO/data/project.db"
[ -f "$DB" ] || { echo "DB nicht gefunden: $DB"; exit 1; }

TITLE=$(echo "$ARGUMENTS" | head -1 | cut -c1-120)
DESC=$(printf '[Quelle: ai-agent]\n\n%s' "$ARGUMENTS" | sed "s/'/''/g")
TITLE_ESC=$(echo "$TITLE" | sed "s/'/''/g")
ID=$(sqlite3 "$DB" "INSERT INTO backlog (title,type,description,priority,milestone,assigned_sprint,status,created_at)
                    VALUES ('$TITLE_ESC','bug','$DESC',3,NULL,NULL,'open',datetime('now'));
                    SELECT last_insert_rowid();")
mkdir -p "$ARTIFACTS_DIR/bugs"
cat > "$ARTIFACTS_DIR/bugs/captured-bug.md" <<EOF
# Bug erfasst
- ID: $ID
- Titel: $TITLE
- Quelle: ai-agent
- DB: $DB
EOF
echo "Bug #$ID erfasst: $TITLE"
```

## Regeln

- Single-Quote-Escaping in SQL ist Pflicht (`'` → `''`).
- Keine Veränderung anderer Tabellen.
- Falls bereits ein Bug mit identischem Titel offen ist: dennoch eintragen — Deduplication ist Aufgabe des Scrum-Masters.
- Schema hat kein `source`-Feld — Herkunft `ai-agent` wird als Prefix `[Quelle: ai-agent]` in `description` mitgegeben, damit der Scrum-Master die KI-erfassten Bugs filtern kann.
