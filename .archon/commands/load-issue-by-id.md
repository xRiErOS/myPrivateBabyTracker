---
description: "Lädt ein Backlog-Item per ID — ignoriert Sprint-Zuweisung."
argument-hint: "<issue-id>"
---

# Load Issue By ID

Lade ein Backlog-Item direkt per ID aus `data/project.db`. Verwendet von `mybaby-direct-issue.yaml`, wenn ein Issue ohne Sprint-Overhead implementiert werden soll.

## Eingabe

- `$ARGUMENTS` → numerische Backlog-ID

## Aufgaben

1. Validierung
   - `$ARGUMENTS` muss eine positive Ganzzahl sein. Sonst Abbruch mit Fehlermeldung.

2. Backlog-Item laden — Akzeptanzkriterien stehen in `description` (kein eigenes Feld):
   ```sql
   SELECT id, type, title, description, priority, status, milestone, assigned_sprint
   FROM backlog WHERE id = $ARGUMENTS;
   ```

3. Bestehende Tasks zu diesem Backlog-Item prüfen
   ```sql
   SELECT id, sprint_id, title, status, effort, validation_output
   FROM tasks WHERE backlog_id = $ARGUMENTS;
   ```

4. Aktive Decisions laden (Kontext fürs Coding)
   ```sql
   SELECT id, title FROM decisions WHERE status='active';
   ```

## Output

Schreibe nach `$ARTIFACTS_DIR/context/issue-context.md`:

```markdown
# Issue-Kontext: #<id>

## Backlog-Item
- Typ: <type>
- Titel: <title>
- Priorität: <priority>
- Status: <status>
- Milestone: <milestone>
- Assigned Sprint: <assigned_sprint oder ->

## Beschreibung (inkl. Akzeptanzkriterien)
<description>

## Bestehende Tasks
- #<id> [<status>, effort=<n>] <title>

## Aktive Decisions
- ADR-<id>: <title>
```

## DB-Pfad-Resolution (PFLICHT)

DB liegt nur im Hauptrepo (siehe `.gitignore`). Pfad immer so auflösen:

```bash
COMMON=$(git rev-parse --git-common-dir)
case "$COMMON" in
  /*) MAIN_REPO=$(dirname "$COMMON") ;;
  *)  MAIN_REPO=$(cd "$COMMON/.." && pwd) ;;
esac
DB="$MAIN_REPO/data/project.db"
```

## Regeln

- Wenn Item nicht existiert: Abbruch mit klarem Fehler, kein Artifact.
- Wenn Item bereits einem aktiven Sprint zugewiesen ist: Hinweis im Output, dass `mybaby-feature` bevorzugt wird — Workflow läuft trotzdem weiter.
- Read-Only auf der DB.
