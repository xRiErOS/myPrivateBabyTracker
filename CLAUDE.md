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

### Scrum Master — Backlog-Kommunikation
- Beim Auflisten von Backlog-Items immer die Backlog-ID (#) mit angeben
- Erleichtert dem Nutzer, Testfälle und Items präzise anzusprechen

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

## Security-Checkliste (K1-K4) — IMPLEMENTIERT

- [x] K1: Header-Stripping-Middleware als erste Middleware
- [x] K2: CSRF Double-Submit-Cookie + CSP-Header auf allen Responses
- [x] K3: Pydantic `Field(max_length=2000, ge=0)` auf allen Plugin-Schemas
- [x] K4: `SECRET_KEY` min 32 Zeichen, App verweigert Start ohne

## Aktueller Stand (Sprint 5 abgeschlossen, v0.5.1)

- **v0.5.1**: 367 Backend-Tests + 83 Frontend-Tests = 450 total
- **Container**: mybaby (UID 999), Port 8080, Volume /volume2/docker/mybaby/data
- **Auth**: AUTH_MODE=disabled (verschoben) + API-Key-Auth fuer Machine-to-Machine (Argon2, Scopes, Rate-Limiting)
- **10 Plugins**: sleep, feeding, diaper, vitamind3, temperature, weight, medication, todo, health, tummytime
- **Plugin-Management**: Basis-Plugins (sleep, feeding, diaper) immer aktiv. Optionale Plugins per Toggle in /admin/plugins konfigurierbar. Nav, Dashboard, Widgets reagieren dynamisch.
- **API-Key-Auth**: ApiKey Model (Argon2 Hash, Prefix-Matching, Scopes read/write/admin), CRUD Router, FastAPI Dependency, Verwaltungsseite /admin/api-keys
- **Health-Plugin**: Spucken + Bauchschmerzen (entry_type, severity, duration nur bei Bauchschmerzen), Dashboard-Widget
- **Tummy-Time-Plugin**: Timer-basiertes Bauchlage-Tracking mit Start/Stop, Dauer-Berechnung, Dashboard-Widget
- **Windeln-Widget Balken**: Proportionale farbige Balken (sapphire=nass, peach=dreckig, mauve=beides) im BabySummary
- **Tag-System**: Polymorphes Tagging (tags + entry_tags Tables), CRUD API, TagSelector (bound + pending Modus) + TagBadges in allen Listen
- **TagSelector Pending-Modus**: Tags direkt im Formular waehlbar bei neuen Eintraegen, kein Zwischenschritt
- **Entry-Detail-Modal**: Getaggte Eintraege auf Tag-Detail-Seite klickbar, Notizen editierbar
- **Baby ToDo-Liste**: Todo-Plugin mit Checkbox-Toggle, Inline-Edit, due_date, completed_at Auto-Set
- **Medikamenten-Stammdaten**: MedicationMaster Model, CRUD API, FK in MedicationEntry, Dropdown in MedicationForm
- **Warnhinweise**: AlertConfig pro Kind, 5 Regeln (+ Fuetterungsintervall-Alarm) + Untertemperatur < 36.5 (blau), Konfigurationsseite unter /admin/alerts
- **Stillmodus**: Deaktivierbar in Verwaltung (localStorage Toggle). Bei deaktiviert: "Letzte Flasche"-Tile + bottle Preset im FeedingForm
- **Dashboard BabySummary 2x3**: Flasche/Brust | Heute gesamt | Letzte Windel | Windeln heute (+ Balken) | Schlaf+Timer | VitD3
- **Dashboard Widget-Grid**: Temperatur + Gewicht + Health + TummyTime links, Medikamente rechts (row-span-2)
- **Add-Menu**: Zentriertes Modal (nicht Bottom-Sheet), scrollbar auf Mobile
- **VitD3-Widget**: Inline im BabySummary-Grid (nicht mehr im Widget-Grid)
- **Tagesverlauf**: Konfigurierbare Track-Sichtbarkeit (Zahnrad + localStorage)
- **Edit-Form**: Visuell im Stamm-Element eingebettet (Card-Einheit, border-t Trennlinie)
- **Navigation**: Verwaltungs-Hub (/admin) mit Kacheln: Kinder + Medikamentenliste + Tags + Warnhinweise + Quick Actions + Stillmodus + Plugins + API-Keys
- **Layout**: Header fixed (nicht sticky), Sidebar fixed auf Desktop, Spacer-Div fuer Zentrierung
- **BottomNav**: Adaptiv — dynamisch basierend auf aktiven Plugins + Mehr-Menü
- **PWA**: manifest.json, PNG-Icons (180/192/512px), apple-touch-icon, standalone display
- **UI-Polish**: Pflichtfelder mit *, ViewTabs visuell getrennt, Temperatur +/- Stepper, Icons in BabySummary, Catppuccin-Toggles (iOS-Stil)
- **Farben**: Header bg-mantle (unterscheidbar von Cards bg-surface0), mantle Token in CSS + Tailwind
- **ADRs**: 10 aktiv
- **SSTD**: `(SSTD) MyBaby Sprint 5 — Plugins + API-Keys + Health + TummyTime.md`

## Bekannte UI-Entscheidungen

- Timestamps: Backend sendet UTC mit Z-Suffix (UTCDatetime Type in schemas/base.py)
- Inputs: font-size 16px (text-base) gegen iOS-Zoom
- Touch-Targets: min 44px
- Button Variants: primary (peach), secondary (surface1), danger (red), success (green)
- Schlaf: Kein Ort, keine Qualität (entfernt nach User-Feedback)
- Windeln: Keine Stuhlfarbe (entfernt), keine Konsistenz (entfernt v0.3.0), Label "dreckig" statt "Stuhl"
- Windel-Timeline-Farbe: bg-sapphire (teal), nicht bg-yellow
- Mahlzeiten: Kein Ende-Feld, Preset feeding_type auf Gegenseite (breast_left↔breast_right), Flasche/Beikost bleibt gleich
- Zeitformat: H:MM h (z.B. "4:25 h"), nicht dezimal
- Button-Text: "Eintragen" fuer neue Eintraege, "Aktualisieren" fuer Edit
- Timer: "Jetzt starten" erstellt sofort DB-Eintrag, laufende Einträge nicht in Liste
- Temperatur: Farben blau (< 36.5 Unterkuehlung), gruen (< 37.5), peach (< 38.5), rot (>= 38.5)
- Gewicht: Anzeige in kg (gespeichert in Gramm), Trend-Anzeige mit +/- Differenz
- Medikamente: Name Pflichtfeld, Dosis optional, Dropdown aus Stammdaten + Freitext-Fallback
- Medikamenten-Stammdaten: MedicationMaster (name unique, active_ingredient, default_unit, is_active)
- Warnhinweise: Default deaktiviert, pro Kind konfigurierbar, severity warning/critical
- Tags: Polymorphe entry_tags Table (entry_type + entry_id), 10 Farbpresets (Catppuccin), TagSelector bound (Edit) + pending (Create), TagBadges auf Eintraegen
- Tag-Seite: Klickbare Entry-Cards mit EntryDetailModal, Read-only Felder + editierbare Notizen
- ToDo: Checkbox-Toggle, completed_at automatisch gesetzt/geloescht, Sortierung: offene zuerst
- Dashboard-Titel: Datum + Uhrzeit (30s Interval) + Kindname rechts
- VitaminD3: Card-Widget ohne Kalender, Gegeben/Ausstehend-Status, Geben-Button inline
- Quick Actions: 3 konfigurierbare Favoriten (localStorage), Default: Schlaf/Mahlzeiten/Windel
- Add-Menue: Zentriertes Modal mit allen 6 Tracking-Optionen, max-h-[80vh] scrollbar
- Plugin-Registry: pluginRegistry.ts als zentrale Plugin-Definition (key, label, icon, route)
- Dashboard-Kacheln: Klick navigiert mit ?range=today, Listen lesen initialen DateRange aus URL
- Tagesverlauf: Zahnrad-Icon fuer Track-Sichtbarkeit (Schlaf/Flasche/Windeln), localStorage-Persistenz
- Windeln-Widget: 2 Tiles im BabySummary-Grid (Letzte Windel + Windeln heute)
- Stillmodus: Deaktivierbar in Verwaltung (localStorage), bei off zeigt "Letzte Flasche" statt "Stillseite"
- Toggles: iOS-Stil (h-8, w-[52px], bg-white shadow-md Knob, bg-green/bg-surface2 Track)
- Header: bg-mantle (Catppuccin Latte #e6e9ef / Macchiato #1e2030), fixed statt sticky
- Sidebar: fixed auf Desktop, Spacer-Div fuer Content-Zentrierung
- Warnhinweise-UI: /admin/alerts mit 5 Regeln (Toggle + Schwellwert), auto-save
- Plugin-Management: pluginRegistry.ts mit isBase Flag, pluginConfig.ts (localStorage), /admin/plugins Seite, Nav/Dashboard dynamisch
- API-Keys: Argon2 Hash, Prefix-Matching (erste 8 Zeichen), Scopes (read/write/admin), Key nur einmal sichtbar nach Erstellung, /admin/api-keys
- Gesundheit (Health): Zwei Typen (spit_up, tummy_ache), Severity (mild/moderate/severe), Duration nur bei Bauchschmerzen (short/medium/long)
- Bauchlage (TummyTime): Timer-basiert analog Sleep, "Jetzt starten" erstellt DB-Eintrag, laufende Sessions nicht in Liste
- Windeln-Balken: Proportionale farbige Balken unter Mini-Kacheln (sapphire=nass, peach=dreckig, mauve=beides, overlay0=trocken)

## Frontend-Portierung (aus Home-Dashboard) — ABGESCHLOSSEN

Alle Komponenten aus `~/Obsidian/tools/home-dashboard/src/pages/baby/` wurden portiert:

| Quelle (Home-Dashboard) | Ziel (MyBaby) | Status |
|--------------------------|---------------|--------|
| Timeline.jsx | `components/dashboard/DayTimeline.tsx` | DONE |
| PatternView.jsx | `components/dashboard/PatternChart.tsx` | DONE |
| WeeklyReport.jsx | `components/dashboard/WeeklyReport.tsx` | DONE |
| BabySummary.jsx | `components/dashboard/BabySummary.tsx` | DONE |
| VitaminD3Button.jsx | `plugins/vitamind3/VitaminD3Button.tsx` | DONE |
| D3Calendar.jsx | `plugins/vitamind3/D3Calendar.tsx` | DONE |
| useBabyApi.js | `lib/timelineUtils.ts` + `hooks/useDashboardData.ts` | DONE |

### Screenshots-Referenz
`500 CONTEXTS/Home Lab Wiki/20 - Projekte/MyBabyTracker/Screenshots.md` — 3 Screenshots (Heute, 7 Tage, 14 Tage)

## Spezialisierte Agenten

Agenten-Definitionen liegen in `~/.claude/agents/`. Sie werden als Subagenten in der Dev-Pipeline eingesetzt.

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

Agenten werden als Subagenten via `Agent`-Tool dispatched. Der Agent-Prompt verweist auf die jeweilige `~/.claude/agents/*.md`-Datei. Jeder Agent liest zu Beginn die CLAUDE.md und die für ihn relevanten Dokumente.

## Deployment-Kontext

```
NPM (baby.familie-riedel.org)
  → Forward-Auth: Authelia (two_factor)
  → Proxy: 192.168.178.185:8080
  → MyBaby Container

Portainer: Git-Deploy von xRiErOS/myPrivateBabyTracker
  Environment-Variablen in Portainer UI setzen (nicht .env auf NAS)
```
