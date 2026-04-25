---
description: "Bug-Fix mit Root-Cause-Analyse, Regressionstest und Status-Update in project.db."
argument-hint: "[task-id | bug-id]"
---

# Bug Fixer

Spezialisierter Coding-Workflow für Bugs. Erst Root-Cause analysieren, dann Regressionstest schreiben, dann Fix.

## Pflicht-Lesen

- `MyBaby_Agent_Context.md`
- `$ARTIFACTS_DIR/context/sprint-context.md`

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

## Eingabe

- `$ARGUMENTS` → Bug-ID (`backlog.id`) oder Task-ID. Falls leer: nächster offener Bug aus aktivem Sprint.

## Ablauf

### 1. Bug laden
```sql
-- Falls Backlog-ID:
SELECT id, title, description, status FROM backlog WHERE id=? AND type='bug';
-- Falls Task-ID:
SELECT t.id, t.title, b.description
FROM tasks t LEFT JOIN backlog b ON t.backlog_id=b.id
WHERE t.id=?;
```

### 2. Root-Cause-Analyse
Strukturiertes Vorgehen:
- Reproduktionsschritte verifizieren
- Stack Trace / Logs lesen
- Betroffene Plugin-Schicht identifizieren (router/schema/model/frontend)
- Hypothese formulieren — bevor Code geändert wird

Output: `$ARTIFACTS_DIR/bugs/root-cause-<id>.md`

### 3. Regressionstest (PFLICHT)
- Test schreiben, der den Bug deterministisch reproduziert (rot).
- Bei Backend-Bugs: `pytest` mit echter In-Memory-DB.
- Bei Frontend-Bugs: `Vitest` + Testing Library.

### 4. Fix
- Minimaler Eingriff — nur die identifizierte Ursache beheben.
- Keine "Refactor by the way"-Änderungen.
- DESIGN.md bei UI-Bugs bindend.

### 5. Verifikation
- Regressionstest grün, alle anderen grün.
- Manuelle Smoke-Prüfung beschreiben (Frontend) bzw. Curl-Aufruf (Backend).

### 6. Status-Update
```sql
-- Task done
UPDATE tasks SET status='done', completed_at=datetime('now'),
    validation_output='<test output>'
WHERE id=?;
-- Backlog-Item closed (falls direkt verknüpft)
UPDATE backlog SET status='closed', completed_at=datetime('now') WHERE id=?;
```

### 7. Commit
- `fix(<plugin>): kurzer Imperativ` — kein Issue-Tag im Body, das ist PR-Aufgabe.
- Vite-Proxy-Check: `100.71.39.53` darf nicht in `vite.config.ts` stehen.

## Fehlerklassen-Scan (HART)

Wenn ein Bug eine konkrete Fehlerklasse betrifft (z.B. fehlendes `Field(max_length=...)`):
**ALLE Plugin-Dateien** auf die gleiche Klasse prüfen, bevor "Done" gemeldet wird. Eine Instanz fixen reicht nicht.

## Output

- `$ARTIFACTS_DIR/bugs/root-cause-<id>.md`
- DB-Update an `tasks`/`backlog`
- Commit im Worktree
