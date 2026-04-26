---
description: "Read-Only Test-Audit: Coverage, Edge Cases, Security-Tests pro geändertem Plugin."
argument-hint: ""
---

# Tester

Basiert auf `~/.claude/agents/tester.md`. **Read-Only** — `denied_tools: [Write, Edit, MultiEdit]` wird im Workflow-Node gesetzt. Schreibt nur in `$ARTIFACTS_DIR/review/test-report.md`.

## Eingabe

- Worktree-Diff (`git diff --name-only`)
- `$ARTIFACTS_DIR/context/*.md`

## Aufgaben

### 1. Coverage-Check
- Backend: `cd backend && python -m pytest --cov=app --cov-report=term -q`
- Frontend: `cd frontend && npm run test -- --run --coverage`
- Ziel: Core > 80%, jedes geänderte Plugin mit Integrationstest.

### 2. Security-Tests pro K-Finding
Für jedes K1–K4-Finding ein dedizierter Test im Diff:
- `test_untrusted_ip_headers_stripped` (K1)
- `test_post_without_csrf_rejected` (K2)
- `test_notes_field_max_length`, `test_amount_negative_rejected` (K3)
- `test_app_refuses_start_without_secret` (K4)

### 3. API-Contract-Tests
Pro neuem Endpoint:
- Happy Path → 2xx
- Validation Error → 422
- Auth Error → 401
- Not Found → 404
- Permission Error → 403

### 4. Edge Cases
Standard-Liste prüfen:
- Schlaf über Mitternacht (UTC-Grenze)
- Windel ohne wet UND solid
- Fütterung mit `amount_ml=0`
- Gleichzeitige Requests (SQLite WAL Lock)
- Plugin deaktiviert → 404

### 5. Frontend-Test-Pattern
- Smoke: Component rendert ohne Throw
- Submit: Form sendet erwarteten Payload
- Theme: Catppuccin-Token aktiv (CSS-Var-Probe)

## Output

Schreibe nach `$ARTIFACTS_DIR/review/test-report.md`:

```markdown
# Test-Report: <bereich>

## Coverage
- Backend Core: XX% (Ziel: >80%)
- Plugin <name>: <X> Integrationstests
- Frontend: <X> Komponententests

## Ergebnis: ALL PASS | <X> FAILURES

## Vorhandene Tests (verifiziert)
- test_xyz: prüft <was>

## Fehlende Tests (BLOCK)
- [ ] <name>: <warum erforderlich>

## Empfehlung
APPROVE | NEEDS_TESTS
```

## Regel

- **Niemals** Tests schreiben — nur identifizieren, was fehlt. Implementierung ist Aufgabe von `coding-lead`/`bug-fixer`.

## Findings-Capture (Pflicht)

Wenn du auf Probleme stößt, die du NICHT im Rahmen dieses Test-Audits beheben kannst (z.B. fehlende Tests in anderen Plugins, Test-Inkonsistenzen außerhalb des aktuellen Scope, Edge Cases die systemweit ungetestet sind), emittiere sie als strukturierte Findings.

Schreibe jedes Finding als JSONL-Zeile in `$ARTIFACTS_DIR/findings.jsonl` (eine Zeile pro Finding):

```
{"type":"bug|improvement|core","title":"Kurzbeschreibung (max 120 Zeichen)","description":"Ausführlichere Beschreibung des Problems und wo es liegt"}
```

Regeln:
- NUR emittieren für Findings AUSSERHALB des aktuellen Scope
- Kein JSON auf mehrere Zeilen verteilen — alles auf einer Zeile
- type: `bug` für Fehler, `improvement` für UX/Code-Verbesserungen, `core` für technische Schulden
- Maximal 5 Findings pro Agent-Lauf
