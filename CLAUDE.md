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
| Auth | Forward-Auth (Authelia) + Local Auth (Argon2, JWT) + 2FA (TOTP) + Passkeys (WebAuthn) |
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

### Lokales Test-Setup (PFLICHT vor Commit/Push)
- `frontend/vite.config.ts` darf **niemals** mit NAS-Proxy-Target (`100.71.39.53`) committet werden
- Vor jedem `git commit` oder `git push`: Proxy auf `http://localhost:8080` zuruecksetzen
- Wird der NAS-Proxy committet, bricht der Container-Build auf der NAS (Tailscale-IP im Container nicht erreichbar)
- Dokumentation: `500 CONTEXTS/Home Lab Wiki/20 - Projekte/MyBabyTracker/MyBaby Lokales Test-Setup (Mac zu NAS API Proxy).md`

## Security-Checkliste (K1-K4) — IMPLEMENTIERT

- [x] K1: Header-Stripping-Middleware als erste Middleware
- [x] K2: CSRF Double-Submit-Cookie + CSP-Header auf allen Responses
- [x] K3: Pydantic `Field(max_length=2000, ge=0)` auf allen Plugin-Schemas
- [x] K4: `SECRET_KEY` min 32 Zeichen, App verweigert Start ohne

## Aktueller Stand (Sprint 19+20 abgeschlossen, v0.8.0)

- **v0.8.0**: Sprint 19 (Julia-Feedback Bugs + Notes UX, 11 Items) + Sprint 20 (Milestone-Fotos + Medienverwaltung, 4 Items), 12 Commits
- **Sprint 19 Bug-Fixes**: Sleep-Timer Race Condition (#151), Schlafhistorie waehrend Timer (#152), Datumswechsel nachts Berlin-TZ (#153), Windel "Beides" einheitlich (#154), 401-Handler PWA Login (#155)
- **Notes UX**: Suchfeld debounced 300ms (#157), Details eingeklappt line-clamp-2 (#158), Titel font-semibold (#159)
- **Live-Preview Markdown**: Split-View Desktop (md:flex), Toggle Mobile (#145)
- **U-Untersuchungen Datumsbereich**: Kalender-Zeitfenster aus birth_date + min/max_age_weeks, Fruehgeborenen-Support (#150)
- **Dashboard-Durchschnitte**: Ø 7T + Ø 14T Fuetterung, Ø 7T Windeln in BabySummary (#156)
- **Photo-Proxy + Thumbnails**: Pillow-Pipeline (Original max 2048px/80% JPEG, Thumbnail 400px _thumb), Auth-Proxy GET /api/v1/milestones/photos/{path}, Static /uploads/ Mount entfernt (#163)
- **Foto-Upload UI**: PhotoSection Komponente, Mobile-Kamera-Input, Skeleton-Loader, Lightbox, max 3 Fotos (#160)
- **Meilenstein-Timeline**: Vertikale Zeitleiste /milestones/timeline, alternierend links/rechts Desktop, linear Mobile, Lazy-Loading (#161)
- **Admin Medienverwaltung**: /admin/media — Grid-Uebersicht, Filter, Bulk-ZIP, Ersetzen/Loeschen, Speicherplatz-Anzeige (#162)
- **v0.7.0**: Sprint 16 (Plugin Wohlbefinden, 7 Items) + Sprint 17 (UI/UX Polish, 6 Items), 15 Commits, 6 Migrationen
- **Wohlbefinden-Rename**: Health-Plugin Display-Name "Gesundheit" → "Wohlbefinden" (en: "Well-being"), interner Key bleibt `health`
- **Wachstumskurven**: WHO-Perzentilen (P3/P15/P50/P85/P97), Gewicht+Laenge nach Geschlecht, Fruehgeborenen-Kalibrierung (korrigiertes Alter)
- **U-Untersuchungen**: Neues Plugin `checkup` — U1-U9 Tracking mit Seed-Daten, empfohlene Zeitraeume, Dashboard-Widget
- **Schreien & Beruhigung**: health_entries erweitert (entry_type: crying), Intensitaet + Dauer + Beruhigungsmethode
- **Schlaf-Ort**: Optional location (bed/carrier/stroller/car/other) in Sleep-Plugin, Toggle im Form
- **Medikamenten-Widget**: Kompaktere Darstellung im Dashboard
- **Geteiltes Notiz-Modul**: Neues Plugin `notes` — SharedNote (title, content, pinned, author), Dashboard-Widget
- **Tasks & Habits**: Todo-Plugin → "Tasks & Habits", Habit-Model (daily/weekly recurrence, streak), neuer Habits-Tab
- **FAB**: Floating Action Button auf Mobile (< md), Quick-Actions, Scale-Animation
- **Warnhinweise visuell**: Grid-Layout (Desktop nebeneinander), staerkere Farben + groessere Icons
- **Warnhinweise altersspezifisch**: min_age_weeks/max_age_weeks in AlertConfig, Altersfilter in alert_service
- **Changelog-Overlay**: Version-Check beim App-Start, Modal mit Aenderungen, localStorage fuer letzte Version
- **Markdown Editor**: Eigener Minimal-Parser (kein externer Dependency), Bearbeiten/Vorschau-Toggle in Todo-Details
- **Migrations-Kette**: ...p7q8r9s0t1u2 → q8r9s0t1u2v3 (habits) → r9s0t1u2v3w4 (alert_age_filter) → t1u2v3w4x5y6 (checkup) → u2v3w4x5y6z7 (crying) → v3w4x5y6z7a8 (shared_notes) → w4x5y6z7a8b9 (sleep_location)
- **Neue Plugins**: growth (WHO-Kurven), checkup (U-Untersuchungen), notes (Eltern-Notizen)
- **14 Plugins gesamt**: sleep, feeding, diaper, vitamind3, temperature, weight, medication, todo, health, tummytime, milestones, growth, checkup, notes
- **i18n**: react-i18next, 15 Namespaces (common, sleep, feeding, diaper, medication, temperature, weight, vitamind3, health, tummytime, milestones, todo, dashboard, admin, auth), de/en, Inline-Resources
- **Spracheinstellung**: User.locale in Preferences-API, ProfilePage Dropdown (de/en), i18next-Sync beim Login + Sprachwechsel
- **Wonder-Weeks-Fix**: Alle 10 Sprungzeitraeume korrigiert (seed_data.py + Alembic UPDATE-Migration n5o6p7q8r9s0)
- **Container**: mybaby (UID 999), Port 8080, Volume /volume2/docker/mybaby/data
- **Auth**: Vollstaendiges Auth-System mit 4 Modi (disabled/local/forward/both), JWT httpOnly Cookie, 2FA TOTP, Passkeys WebAuthn, API-Key-Auth fuer M2M
- **11 Plugins**: sleep, feeding, diaper, vitamind3, temperature, weight, medication, todo, health, tummytime, milestones
- **Milestones-Plugin**: 5 Tabellen (categories, templates, entries, photos, leaps), Seed-Daten (8 Kategorien, 107 Vorlagen, 10 Spruenge), CRUD + Quick-Complete + Photo-Upload + Leap-Status-API
- **Fruehgeborenen-Modus**: Child-Model: estimated_birth_date + is_preterm, korrigiertes Alter fuer Leap-Berechnung und Suggestions
- **Recurring Tasks**: TodoTemplate Model, CRUD + Clone-to-Today-Endpoint (kein Scheduler, manueller Klick)
- **Photo-Upload**: Lokale Dateispeicherung unter data/uploads/milestones/{child_id}/{uuid}.ext, Static-File-Mount /uploads/
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
- **Milestones-Frontend**: 3-Tab-View (Uebersicht/Alle/Spruenge), MilestonesList mit Filter+Suche+CRUD, LeapCalendar, MilestonesOverview mit Suggestions+Quick-Complete, Dashboard-Widget, EntryDetailModal erweitert
- **ADRs**: 10 aktiv + 6 Milestones-ADRs (M1-M6 in Implementierungsplan)
- **ErrorBoundary**: Globale React ErrorBoundary in App.tsx, verhindert schwarze Screens bei Runtime-Fehlern
- **Dashboard-Visibility**: 2. Toggle (sapphire) pro Plugin in /admin/plugins — "Zeige auf Dashboard" unabhaengig von "Plugin aktiv"
- **Tag-Archivierung**: entry_tags.is_archived Flag, PATCH /entries/{id}, Toggle "Archivierte anzeigen" auf TagDetailPage
- **TagDetailPage**: Sortierung nach created_at desc, Gruppierung nach Datum (Heute/Gestern/dd.MM.yyyy)
- **Liste bei Create**: Alle 9 Tracking-Pages verstecken die Liste wenn das Neu-Formular sichtbar ist
- **Mobile Nav**: BottomNav reduziert auf 4 feste Items (Dashboard/Schlaf/Mahlzeiten/Windeln) + Burger-Drawer
- **Swipe-Gesten**: useSwipe Hook fuer Dashboard-Tabs und Milestones-Tabs, Threshold 50px
- **Migrations-Kette**: ...d5e6f7a8b9c0 → e6f7a8b9c0d1 (entry_tags.created_at) → f7a8b9c0d1e2 (entry_tags.is_archived)
- **Tag-Swipe**: SwipeableEntry auf TagDetailPage — links=archivieren, rechts=Tag-Zuordnung entfernen. Visuelle Hints waehrend des Swipens.
- **Tag-Suche**: Suchfeld auf TagDetailPage durchsucht entry_summary + Notizen (Backend liefert Notes via Separator)
- **Tag-Entry-Anzeige**: Summary in Peach+font-semibold (Zeile 1), Notizen in normaler Schrift (Zeile 2), getrennt am " — " Separator
- **TodoWidget**: Dashboard-Kachel — 1 offenes ToDo zeigt Titel, >1 zeigt Zaehler + Fortschrittsbalken, 0 zeigt "Alles erledigt!"
- **TagsWidget**: Dashboard-Kachel — Top 3 Tags mit Farbpunkt + Name + non-archived Entry-Count Badge
- **Alert-Dismiss**: X-Button an Warnmeldungen, 6h Dismiss via localStorage (Key: Kind+Typ+Index)
- **MobileMenu**: Burger-Drawer vom Header (nicht BottomNav), 3-spaltiges Grid, auto-close bei Navigation
- **BottomNav**: Nur zentrierter Dashboard-Button auf Mobile, alle anderen Items im MobileMenu
- **SSTD**: `(SSTD) MyBaby Sprint 4b — User-Feedback-Fixes + UX-Erweiterungen.md`
- **Recurring Tasks Frontend**: TodoPage mit Tab-Navigation (Aufgaben / Vorlagen), TemplateList mit CRUD, Clone-to-Today-Button, Active-Toggle
- **Sturmphase-Alert**: leap_storm_enabled in AlertConfig, alert_service prueft aktive Sturmphase, AlertBanner zeigt info-Severity in Blau mit Info-Icon
- **Widget-Grid Reihenfolge**: getWidgetOrder/moveWidget in pluginConfig.ts (localStorage), Dashboard rendert Widgets dynamisch, Up/Down-Buttons in /admin/plugins
- **entry_summary Batch**: N+1 auf max 8 Queries reduziert — eine IN-Clause pro Plugin-Typ statt einzelne Abfragen
- **test_alerts.py Fix**: Hardcoded Timestamps durch relative ersetzt (_recent Helper), alle 16 Tests zeitunabhaengig
- **Migrations-Kette**: ...f7a8b9c0d1e2 → g8h9i0j1k2l3 (alert_configs.leap_storm_enabled)
- **Baby Buddy Migration**: 729 Eintraege importiert (217 Schlaf, 308 Mahlzeiten, 197 Windeln, 7 Temperatur) + 21 VitD3 manuell. Import-Script um Temperatur erweitert.
- **Kind**: Anna Viktoria Riedel (ID 2), Test Baby geloescht
- **SSTD**: `(SSTD) MyBaby Sprint 10 — Admin UX + Recurring Tasks + Alerts.md`
- **Auth-System (Sprint 12)**: JWT httpOnly Cookie (1 Woche, secure nur prod), LoginResponse mit requires_totp Signal, AuthProvider + AuthGuard im Frontend
- **Login-Endpoints**: POST /auth/login (Passwort + opt. TOTP), POST /auth/logout, GET /auth/me, GET /auth/status, POST /auth/change-password
- **2FA TOTP**: TotpSecret Model (secret + backup_codes), pyotp + qrcode[pil], Setup/Verify/Disable Endpoints, QR-Code + 8 Backup-Codes
- **Passkeys WebAuthn**: WebAuthnCredential Model (credential_id + public_key + sign_count), py_webauthn, Register/Login Begin+Finish, Credential CRUD
- **LoginPage**: 2-Step (Passwort → TOTP wenn aktiviert), Passkey-Button als Alternative
- **AuthSettingsPage**: /admin/auth — Auth-Modus Info, User-Info, Passwort aendern, 2FA Setup/Disable, Passkey verwalten, Logout
- **Migrations-Kette**: ...g8h9i0j1k2l3 → h9i0j1k2l3m4 (totp_secrets + users.totp_enabled) → i0j1k2l3m4n5 (webauthn_credentials)
- **Nutzerverwaltung (Sprint 13)**: User CRUD API (admin-only: list/create/update/delete/set-password), UserManagementPage mit Modals, Admin-Kachel "Benutzer"
- **Nutzer-Zeitzone**: users.timezone (default Europe/Berlin), Alembic Migration j1k2l3m4n5o6, in UserResponse + ProfilePage
- **UserPreferences**: Serverseitig statt localStorage — breastfeeding_enabled, quick_actions (JSON), widget_order (JSON), track_visibility (JSON). GET/PATCH /preferences API, auto-create bei erstem Zugriff
- **ProfilePage**: /profile — Zeitzone-Auswahl, Stillmodus-Toggle, Quick Actions Dropdown, User-Info. Link im MobileMenu
- **Migrations-Kette**: ...i0j1k2l3m4n5 → j1k2l3m4n5o6 (users.timezone) → k2l3m4n5o6p7 (user_preferences)

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
- Meilensteine: 5 Tabellen (categories, templates, entries, photos, leap_definitions), Seed-Daten via Alembic-Migration
- Meilenstein-Kategorien: 8 System-Kategorien (Catppuccin-Farben, Lucide-Icons, nicht loeschbar) + Custom pro Kind
- Meilenstein-Vorlagen: source_type (medical/emotional/leap), suggested_age_weeks fuer altersbasierte Vorschlaege
- Meilenstein-Eintraege: Quick-Complete-Flow (Datum + Konfidenz), Photo-Upload (max 10MB, JPEG/PNG/WebP)
- Leaps: 10 Spruenge nach Plooij, Berechnung ab ET (Fallback birth_date), Status: past/active_storm/active_sun/upcoming/far_future
- Meilenstein-Wording: Soft-Wording durchgehend, kein "verspaetet"-Label, Disclaimer "Jedes Kind entwickelt sich in eigenem Tempo"
- Fruehgeborenen-Modus: is_preterm + estimated_birth_date im Child-Model, korrigiertes Alter fuer Leaps + Suggestions
- Todo-Vorlagen: TodoTemplate (title, details, is_active), Clone-to-Today-Button erstellt normalen TodoEntry mit due_date=heute
- Photo-Speicherung: data/uploads/milestones/{child_id}/{uuid}.ext, Auth-Proxy /api/v1/milestones/photos/{path} (kein Static-Mount), Cascade-Delete bei Entry-Loeschung
- Photo-Thumbnails: Pillow-Pipeline generiert {uuid}_thumb.jpg (400px) bei Upload, Original max 2048px/80% JPEG
- Photo-Limit: Max 3 Fotos je Meilenstein, Upload-Button ausgeblendet wenn erreicht
- Meilenstein-Timeline: /milestones/timeline, vertikale Zeitleiste alternierend, Placeholder mit Kategorie-Icon wenn kein Foto
- Admin-Medienverwaltung: /admin/media, Grid-Thumbnails, Filter, Bulk-ZIP-Download, Speicherplatz-Anzeige
- Notes-Suche: Backend ILIKE auf title+content, Frontend debounced 300ms
- Notes-Details: line-clamp-2 eingeklappt, Titel text-base font-semibold
- Markdown-Editor: Split-View Desktop (md:flex), Toggle Mobile (Bearbeiten/Vorschau)
- Session-Cookie: Axios 401-Interceptor → redirect LoginPage via set401Handler Callback
- Datumswechsel: berlinDayBounds() statt UTC T00:00:00Z fuer Tagesfilter

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
