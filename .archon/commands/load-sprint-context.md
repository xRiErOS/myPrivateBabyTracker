---
description: "Lädt aktiven Sprint, offene Tasks und letzten Session-Snapshot. Pflicht-Node am Start jedes Workflows."
argument-hint: ""
---

# Load Sprint Context

Lade den aktuellen Projektstand aus `data/project.db` (Source of Truth) und schreibe einen strukturierten Kontext-Block als Artifact für nachfolgende Nodes.

## Echtes Schema (verifiziert)

```
sprints:                  id, name, start_date, end_date, status, capacity, notes
tasks:                    id, backlog_id, sprint_id, title, assignee, status, effort,
                          started_at, completed_at, validation_output, notes
backlog:                  id, title, type, description, priority, milestone,
                          assigned_sprint, status, created_at, completed_at
decisions:                id, title, decision, rationale, alternatives, status, created_at
conversation_snapshots:   id, agent_id, session_timestamp, summary,
                          decisions_made, next_session_goals
```

## Aufgaben

1. Aktiven Sprint laden
   ```sql
   SELECT id, name, status, start_date, end_date, capacity, notes
   FROM sprints WHERE status='active';
   ```

2. Offene Tasks im aktiven Sprint laden
   ```sql
   SELECT id, sprint_id, backlog_id, title, status, effort, validation_output
   FROM tasks
   WHERE sprint_id IN (SELECT id FROM sprints WHERE status='active')
     AND status IN ('todo', 'in_progress')
   ORDER BY id;
   ```

3. Top-5 offene Backlog-Items (priorisiert)
   ```sql
   SELECT id, type, title, priority, status, milestone, assigned_sprint
   FROM backlog WHERE status='open' ORDER BY priority LIMIT 5;
   ```

4. Aktive Architekturentscheidungen
   ```sql
   SELECT id, title, status FROM decisions WHERE status='active' ORDER BY id;
   ```

5. Letzten Session-Snapshot lesen
   ```sql
   SELECT id, session_timestamp, agent_id, summary, next_session_goals
   FROM conversation_snapshots
   ORDER BY session_timestamp DESC LIMIT 1;
   ```

## Output

Schreibe einen strukturierten Markdown-Block nach `$ARTIFACTS_DIR/context/sprint-context.md`:

```markdown
# Sprint-Kontext

## Aktiver Sprint
<id, name, start_date — end_date, capacity PT>
Notes: <notes>

## Offene Tasks
- #<id> [<status>, effort=<n>] <title>

## Top-Backlog
- #<id> [<type>/<priority>] <title> (assigned_sprint: <id|->)

## Aktive Decisions
- ADR-<id>: <title>

## Letzter Snapshot
<session_timestamp> — <agent_id>: <summary>
Next: <next_session_goals>
```

## DB-Pfad-Resolution (PFLICHT für jeden DB-Zugriff)

`data/project.db` ist via `.gitignore` (`*.db`) nicht im Worktree. Im Workflow läuft jeder Node aber in einem Worktree-Verzeichnis. Daher **immer** auf die Main-Repo-DB zugreifen — über git-common-dir aufgelöst:

```bash
COMMON=$(git rev-parse --git-common-dir)
case "$COMMON" in
  /*) MAIN_REPO=$(dirname "$COMMON") ;;
  *)  MAIN_REPO=$(cd "$COMMON/.." && pwd) ;;
esac
DB="$MAIN_REPO/data/project.db"
[ -f "$DB" ] || { echo "DB nicht gefunden: $DB"; exit 1; }
```

- Im **Hauptrepo** liefert `git rev-parse --git-common-dir` `.git` (relativ) → `MAIN_REPO=$(pwd)`.
- Im **Worktree** liefert es einen **absoluten** Pfad auf den Main-`.git`-Ordner → `MAIN_REPO` zeigt korrekt aufs Hauptrepo.

## Regeln

- DB-Pfad **immer** wie oben auflösen — niemals `data/project.db` relativ verwenden.
- Bei leerer DB: leere Sektionen erzeugen, nicht abbrechen — nachgelagerte Nodes entscheiden.
- Niemals Schreibzugriff auf die DB in diesem Command.
