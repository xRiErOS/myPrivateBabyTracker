---
description: "Pflicht-Abschluss: schreibt conversation_snapshots-Eintrag in project.db und ggf. memory.db."
argument-hint: ""
---

# Save Session Snapshot

Letzter Schritt jeder Session. Ohne Snapshot ist eine Session unvollständig.

## DB-Pfad-Resolution (PFLICHT)

```bash
COMMON=$(git rev-parse --git-common-dir)
case "$COMMON" in
  /*) MAIN_REPO=$(dirname "$COMMON") ;;
  *)  MAIN_REPO=$(cd "$COMMON/.." && pwd) ;;
esac
DB="$MAIN_REPO/data/project.db"
```

Worktrees enthalten keine DB (`.gitignore`). Alle `sqlite3`-Aufrufe verwenden `$DB`.

## Aufgaben

### 1. Snapshot in Main-Repo-DB (`$DB`) schreiben

Echtes Schema (verifiziert):
```
conversation_snapshots:
  id (PK), agent_id, session_timestamp,
  summary, decisions_made, next_session_goals
```

Es gibt **keine** `sprint_id`/`task_id`/`artifacts_path`-Spalten — Sprint/Task/Artifacts-Bezug wird in `summary` und `next_session_goals` als Freitext eingebettet.

```sql
INSERT INTO conversation_snapshots
  (agent_id, session_timestamp, summary, decisions_made, next_session_goals)
VALUES (
  '<agent-name, z.B. coding-lead>',
  datetime('now'),
  '<3-5 Sätze: was wurde gemacht. Sprint #X, Task #Y, Artifacts: $ARTIFACTS_DIR>',
  '<JSON-Array entscheidungen oder NULL>',
  '<was muss als nächstes passieren — wer übernimmt>'
);
```

Konvention für Bezüge in `summary`:
- Sprint: `Sprint #<id>` als Prefix
- Tasks: `Tasks #<id>, #<id>` mit Komma getrennt
- Artifacts: `Artifacts: $ARTIFACTS_DIR` am Ende

### 2. Selektiv in memory.db (per `mcp__memory__add_memory`)
Nur wenn ETWAS davon zutrifft:
- Architekturentscheidung getroffen → Domain `mybaby`, Area `architecture`, Wichtigkeit `Zentral`
- Wiederkehrendes Pattern erkannt → Area `pattern`, Wichtigkeit `Wichtig`
- Sprint abgeschlossen → Area `sprint`, Wichtigkeit `Wichtig`

**NICHT in memory schreiben:**
- Trivialer Bug-Fix
- Einzelner Task ohne Pattern-Charakter
- Ephemerer Sprint-Status

### 3. Artefakte sichern
Verzeichnis `$ARTIFACTS_DIR/` zusammenfassen — falls Workflow es nicht selbst aufbewahrt.

## Output

```markdown
# Session-Snapshot

- snapshot_id: <neue id>
- agent_id: <name>
- session_timestamp: <iso>
- sprint/tasks (in summary eingebettet): #<sprint-id>, #<task-id>, ...
- artifacts: $ARTIFACTS_DIR

## Summary
<3-5 Sätze>

## Decisions made
<JSON-Array oder leer>

## Next session goals
<konkrete nächste Schritte für nachfolgenden Agent>

## Memory geschrieben
- [ ] keine
- [x] mybaby/<area>: <titel>
```

## Regel

- Snapshot **immer** schreiben, auch bei Abbruch — dann mit `summary='abgebrochen: <grund>'`.
- Memory-Schreiben ist **selektiv**, nicht automatisch.
