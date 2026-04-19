# MyBaby — Projekt-Kontext für KI-Agenten

## Projekt

Self-hosted, plugin-basierter Baby-Tracker. Ersetzt Baby Buddy mit modularem, AI-first System.
- **Repo:** [xRiErOS/myPrivateBabyTracker](https://github.com/xRiErOS/myPrivateBabyTracker)
- **Domain:** baby.familie-riedel.org
- **Deployment:** Synology DS725+ via Portainer, hinter NPM + Authelia

## Architektur-Dokumente

| Dokument | Pfad | Zweck |
|----------|------|-------|
| Architecture Spec | `docs/superpowers/specs/2026-04-19-mybaby-architecture-design.md` | Vollständige Architektur mit 18 Abschnitten, 7 ADRs, Security (K1-K4) |
| Implementation Plan | `docs/superpowers/plans/2026-04-19-mybaby-v0.1.0-mvp.md` | 14 Tasks für MVP, TDD, bite-sized Steps |
| Design System | `DESIGN.md` | Bindende UI-Referenz: Catppuccin, Typografie, 12 Komponenten |
| Architecture Review | (im home-dashboard Repo) | Unabhängiges Review mit 4 kritischen + 8 wichtigen Findings |

## Projekt-DB (SQLite — Source of Truth)

Pfad: `data/project.db`

### Schema

```sql
-- Sprints: Iterationsplanung
SELECT * FROM sprints WHERE status='active';

-- Backlog: Alle Features, Bugs, Chores
SELECT * FROM backlog WHERE milestone='v0.1.0' AND status='open' ORDER BY priority;

-- Tasks: Granulare Arbeitsschritte innerhalb eines Sprints
SELECT * FROM tasks WHERE sprint_id=1 AND status='todo';

-- Decisions: Architektur-Entscheidungen (ADRs)
SELECT * FROM decisions WHERE status='active';

-- Session-Snapshots: Was jede Agent-Session getan hat
SELECT * FROM conversation_snapshots ORDER BY session_timestamp DESC LIMIT 1;
```

### Workflow

**Scrum-Master-Session (Planung):**
1. Backlog reviewen: `SELECT * FROM backlog WHERE status='open' ORDER BY priority`
2. Sprint planen: Tasks aus Backlog erstellen
3. Sprint aktivieren: `UPDATE sprints SET status='active' WHERE id=?`

**Coding-Lead-Session (Umsetzung):**
1. Aktiven Sprint laden: `SELECT * FROM sprints WHERE status='active'`
2. Nächsten Task holen: `SELECT * FROM tasks WHERE sprint_id=? AND status='todo' ORDER BY id LIMIT 1`
3. Task starten: `UPDATE tasks SET status='in_progress', started_at=datetime('now')`
4. Nach Abschluss: `UPDATE tasks SET status='done', completed_at=datetime('now'), validation_output='...'`
5. Session-Snapshot speichern

**Pflicht:** Jede Session MUSS einen `conversation_snapshots`-Eintrag hinterlassen.

## Tech Stack

| Layer | Technologie |
|-------|-------------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic 2 |
| Frontend | React 18, TypeScript, Tailwind CSS 3, Vite 6 |
| Database | SQLite WAL |
| Auth | Forward-Auth (Authelia) + Local Auth (Argon2) |
| Logging | structlog (JSON) |
| Security | starlette-csrf, slowapi, CSP headers |
| CLI | Typer |
| Container | python:3.12-slim (Multi-Stage mit node:22-alpine) |

## Konventionen

### Timestamps
- **Alle Timestamps in der DB sind UTC** — keine Ausnahmen
- API akzeptiert ISO 8601 mit Offset, konvertiert zu UTC vor Speicherung
- Frontend konvertiert UTC → Lokalzeit via `Intl.DateTimeFormat`

### Plugin-Struktur
```
backend/app/plugins/{name}/
  __init__.py    # PluginClass(PluginBase)
  models.py      # SQLAlchemy Model
  schemas.py     # Pydantic Create/Update/Response
  router.py      # FastAPI Router /api/v1/{name}/*
  widget.py      # Dashboard WidgetDef

frontend/src/plugins/{name}/
  {Name}Form.tsx
  {Name}Widget.tsx
  {Name}List.tsx
```

### Farben
Tailwind-Token `ground` statt `base` (Konflikt mit Tailwind `text-base`).
Catppuccin Latte (Light) / Macchiato (Dark) via CSS-Variablen.
Details: `DESIGN.md`

### Testing
- Backend: pytest + httpx AsyncClient, In-Memory SQLite
- Frontend: Vitest + Testing Library
- Coverage-Ziel: Core > 80%

### Commits
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `security:`
- Ein Commit pro Task-Abschluss

## Security-Checkliste (K1-K4)

- [ ] K1: Header-Stripping-Middleware als erste Middleware
- [ ] K2: CSRF Double-Submit-Cookie + CSP-Header auf allen Responses
- [ ] K3: Pydantic `Field(max_length=2000, ge=0)` auf allen Plugin-Schemas
- [ ] K4: `SECRET_KEY` min 32 Zeichen, App verweigert Start ohne

## Frontend-Portierung

Bestehende Komponenten aus `~/Obsidian/tools/home-dashboard/src/pages/baby/` werden portiert:
- JSX → TSX (TypeScript-Typen hinzufügen)
- API-Pfade: `/baby-api/` → `/api/v1/{plugin}/`
- Baby-Buddy-Workarounds entfernen (client-side Filterung, Notes-als-D3-Tracker)
- Alle Tailwind-Klassen und visuelles Design beibehalten (DESIGN.md ist bindend)

## Spezialisierte Agenten

Agenten-Definitionen liegen in `.claude/agents/`. Sie werden als Subagenten in der Dev-Pipeline eingesetzt.

| Agent | Datei | Rolle | Wann einsetzen |
|-------|-------|-------|----------------|
| Scrum Master | `scrum-master.md` | Sprint-Planung, Backlog-Pflege, Koordination | Sprint-Start, Sprint-Review, Backlog-Grooming |
| Coding Lead | `coding-lead.md` | TDD-Implementierung nach Plan | Task-Umsetzung (holt nächsten Task aus DB) |
| Code Reviewer | `code-reviewer.md` | Security, Spec-Konformität, Code-Qualität | Nach jedem abgeschlossenen Task / PR |
| UI/UX Expert | `ui-ux-expert.md` | DESIGN.md-Konformität, Touch-Tauglichkeit, iOS | Bei Frontend-Tasks, nach Portierung |
| Tester | `tester.md` | Coverage, Security-Tests, Edge Cases | Nach Feature-Abschluss, vor Sprint-Close |

### Dev-Pipeline pro Task

```
Scrum Master → weist Task zu
  → Coding Lead → implementiert (TDD)
    → Code Reviewer → prüft Security + Spec
    → Tester → prüft Coverage + Edge Cases
    → UI/UX Expert → prüft visuelles Design (nur bei Frontend)
  → Scrum Master → markiert Task als done in project.db
```

### Agenten aufrufen

Agenten werden als Subagenten via `Agent`-Tool dispatched. Der Agent-Prompt verweist auf die jeweilige `.claude/agents/*.md`-Datei. Jeder Agent liest zu Beginn die CLAUDE.md und die für ihn relevanten Dokumente.

## Deployment-Kontext

```
NPM (baby.familie-riedel.org)
  → Forward-Auth: Authelia (two_factor)
  → Proxy: 192.168.178.185:8080
  → MyBaby Container

Portainer: Git-Deploy von xRiErOS/myPrivateBabyTracker
  Environment-Variablen in Portainer UI setzen (nicht .env auf NAS)
```
