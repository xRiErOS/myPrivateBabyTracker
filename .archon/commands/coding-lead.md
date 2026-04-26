---
description: "TDD-Implementierung: Test zuerst, dann Code. Plugin-Struktur, Catppuccin-Tokens, Conventional Commits."
argument-hint: "[task-id]"
---

# Coding Lead

Basiert auf `~/.claude/agents/coding-lead.md`. Implementiert Tasks aus dem aktiven Sprint per TDD, hält die Plugin-Struktur ein und folgt DESIGN.md. Schreibt Status zurück in `data/project.db`.

## Pflicht-Lesen vor Implementierung

- `MyBaby_Agent_Context.md`
- `DESIGN.md` (UI-Token-Referenz, bindend)
- `$ARTIFACTS_DIR/context/sprint-context.md` oder `$ARTIFACTS_DIR/context/issue-context.md`
- Falls vorhanden: `$ARTIFACTS_DIR/sprint/coding-prompts.md`

## Eingabe

- Optional `$ARGUMENTS` → konkrete Task-ID. Sonst nächste offene Task aus Sprint.

## DB-Pfad-Resolution (PFLICHT für jeden DB-Zugriff)

Im Worktree fehlt `data/project.db` (`.gitignore`). Immer auflösen:

```bash
COMMON=$(git rev-parse --git-common-dir)
case "$COMMON" in
  /*) MAIN_REPO=$(dirname "$COMMON") ;;
  *)  MAIN_REPO=$(cd "$COMMON/.." && pwd) ;;
esac
DB="$MAIN_REPO/data/project.db"
```

Alle `sqlite3`-Aufrufe verwenden `$DB`.

## TDD-Ablauf pro Task

1. Task starten
   ```sql
   UPDATE tasks SET status='in_progress', started_at=datetime('now') WHERE id=?;
   ```

2. **Test zuerst** schreiben (rot)
   - Backend: `pytest` + `httpx.AsyncClient`, In-Memory SQLite
   - Frontend: `Vitest` + Testing Library
   - Test ausführen, rot bestätigen.

3. **Implementierung** (grün)
   - Backend Plugin: `backend/app/plugins/{name}/` mit `__init__.py` (PluginClass), `models.py`, `schemas.py`, `router.py`, `widget.py`
   - Frontend Plugin: `frontend/src/plugins/{name}/` mit `{Name}Form.tsx`, `{Name}Widget.tsx`, `{Name}List.tsx`
   - Catppuccin-Tokens: `ground` statt `base`, `peach`, `sapphire`, `green`, `red`, `text`. Niemals Hex-Werte hardcoden.
   - Touch-Targets ≥ 44px, `rounded-card`, Font-Klassen `font-headline|font-body|font-label`.
   - Timestamps UTC mit `DateTime(timezone=True)` und `func.now()`.

4. **Refactor** — Test grün halten.

5. Commit (Conventional)
   - `feat(<plugin>): ...`
   - `fix(<plugin>): ...`
   - `chore: ...`
   - **NIEMALS** `frontend/vite.config.ts` mit NAS-IP `100.71.39.53` committen — Proxy auf `http://localhost:8080` zurücksetzen.

6. Task abschließen
   ```sql
   UPDATE tasks
   SET status='done', completed_at=datetime('now'),
       validation_output='<pytest+vitest output kurzform>'
   WHERE id=?;
   ```
   Wenn alle Tasks zu einem Backlog-Item done sind, das Backlog-Item schließen:
   ```sql
   UPDATE backlog SET status='closed', completed_at=datetime('now')
   WHERE id=? AND NOT EXISTS (
     SELECT 1 FROM tasks WHERE backlog_id=? AND status<>'done'
   );
   ```

## Alembic-Reminder (PFLICHT)

Wenn `models.py` oder Schema-Dateien geändert wurden, am Ende der Implementierung erinnern:

```
ALEMBIC-MIGRATION ERFORDERLICH:
  cd backend && alembic revision --autogenerate -m "<beschreibung>"
  alembic upgrade head
```

## Regeln (HART)

- TDD nicht überspringen — Test rot vor Implementierung Pflicht.
- Plugin-Struktur strikt einhalten, keine Cross-Plugin-Imports.
- DESIGN.md ist bindend — bei UI-Konflikt zuerst klären, nicht selbst entscheiden.
- Keine `dangerouslySetInnerHTML`, keine Raw-SQL-Strings, keine Header-Vertrauen.
- **Niemals** memory.db schreiben (Rauschen vermeiden — das macht `save-session-snapshot`).
- Bei Blocker: stoppen, Task auf `blocked` setzen, Frage ans Team stellen.

## Output

- Tests: `cd backend && python -m pytest -q` und `cd frontend && npm run test -- --run` müssen grün sein.
- DB-Update an `tasks`.
- Commits im Worktree.

## Findings-Capture (Pflicht)

Wenn du auf Probleme stößt, die du NICHT im Rahmen dieses Tasks beheben kannst (z.B. Nebeneffekte, fehlgeschlagene Tests die nicht zum Task gehören, Code-Inkonsistenzen, fehlende Tests in anderen Bereichen), emittiere sie als strukturierte Findings in stdout.

Schreibe zusätzlich jedes Finding als JSONL-Zeile in `$ARTIFACTS_DIR/findings.jsonl` (eine Zeile pro Finding):

```
{"type":"bug|improvement|core","title":"Kurzbeschreibung (max 120 Zeichen)","description":"Ausführlichere Beschreibung des Problems und wo es liegt"}
```

Regeln:
- NUR emittieren für Findings AUSSERHALB des aktuellen Scope
- Kein JSON auf mehrere Zeilen verteilen — alles auf einer Zeile
- type: `bug` für Fehler, `improvement` für UX/Code-Verbesserungen, `core` für technische Schulden
- Maximal 5 Findings pro Agent-Lauf
