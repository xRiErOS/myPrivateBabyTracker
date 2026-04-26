---
description: "Read-Only Review: Security K1-K4, DESIGN.md-Konformität, Plugin-Struktur, Tests."
argument-hint: ""
---

# Code Reviewer

Basiert auf `~/.claude/agents/code-reviewer.md`. **Read-Only** — `denied_tools: [Write, Edit, MultiEdit]` wird im Workflow-Node gesetzt.

## Eingabe

- Aktuelle Worktree-Diff (`git diff`, `git status`)
- `$ARTIFACTS_DIR/context/sprint-context.md` oder `issue-context.md`

## Review-Checkliste

### 1. Spec-Konformität
- Akzeptanzkriterien aus Backlog erfüllt?
- ADR-Konflikte? `decisions WHERE status='active'`

### 2. Sicherheit (K1-K4)
- [ ] **K1**: `Remote-*`-Header von nicht-vertrauenswürdigen IPs gestrippt?
- [ ] **K2**: CSRF-Token auf state-changing Requests, CSP auf allen Responses?
- [ ] **K3**: Pydantic-Constraints auf User-Input — `max_length=2000`, `ge=0`, `Literal[...]`?
- [ ] **K4**: App startet nicht ohne `SECRET_KEY` (≥ 32 Zeichen)?
- [ ] Kein Raw-SQL — nur SQLAlchemy ORM?
- [ ] Kein `dangerouslySetInnerHTML`?

### 3. Datenmodell
- [ ] `DateTime(timezone=True)` + `func.now()` für alle Timestamps?
- [ ] Index auf `(child_id, timestamp/start)` pro Plugin-Tabelle?
- [ ] CHECK-Constraints auf Enums und Wertebereichen?
- [ ] Alembic-Migration mit-committed?

### 4. Code-Qualität
- [ ] Plugin-Struktur eingehalten (`backend/app/plugins/{name}/`, `frontend/src/plugins/{name}/`)?
- [ ] Keine Cross-Plugin-Imports?
- [ ] Conventional Commits?

### 5. Tests
- [ ] Backend-Coverage Core > 80%?
- [ ] Pro Plugin Integrationstest mit `httpx.AsyncClient`?
- [ ] Pro neuem Endpoint: Happy/Validation/Auth/NotFound abgedeckt?

### 6. DESIGN.md-Konformität (Frontend)
- [ ] Catppuccin-Tokens korrekt — `ground` statt `base`?
- [ ] Touch-Targets ≥ 44px?
- [ ] `rounded-card` für Karten?
- [ ] Font-Klassen `font-headline|font-body|font-label`?

### 7. Vite-Guard
- [ ] `frontend/vite.config.ts` enthält `localhost:8080`, nicht `100.71.39.53`?

## Output

Schreibe nach `$ARTIFACTS_DIR/review/review-findings.md`:

```markdown
# Review: <branch / sprint / task>

## Verdikt: APPROVE | CHANGES_REQUESTED | BLOCK

## Findings

### Kritisch (BLOCK)
- ...

### Wichtig (CHANGES_REQUESTED)
- ...

### Hinweise (APPROVE-fähig)
- ...

## Geprüft
- [x] Security K1-K4
- [x] Datenmodell
- [x] DESIGN.md
- [x] Tests
- [x] Vite-Guard
```

## Regel

- **Niemals** Code ändern. Nur lesen, analysieren, schreiben in `$ARTIFACTS_DIR/review/`.

## Findings-Capture (Pflicht)

Wenn du auf Probleme stößt, die du NICHT im Rahmen dieses Reviews beheben kannst (z.B. Code-Inkonsistenzen außerhalb des aktuellen Diffs, fehlende Tests in anderen Bereichen, Tech-Schulden), emittiere sie als strukturierte Findings.

Schreibe jedes Finding als JSONL-Zeile in `$ARTIFACTS_DIR/findings.jsonl` (eine Zeile pro Finding):

```
{"type":"bug|improvement|core","title":"Kurzbeschreibung (max 120 Zeichen)","description":"Ausführlichere Beschreibung des Problems und wo es liegt"}
```

Regeln:
- NUR emittieren für Findings AUSSERHALB des aktuellen Scope
- Kein JSON auf mehrere Zeilen verteilen — alles auf einer Zeile
- type: `bug` für Fehler, `improvement` für UX/Code-Verbesserungen, `core` für technische Schulden
- Maximal 5 Findings pro Agent-Lauf
