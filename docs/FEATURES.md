# MyBaby — Feature-Inventar

Stand: 2026-04-28 · Version: 0.8.0+ · Sprint 25 (Dokumentation der App)

Dieses Dokument ist das Source-of-Truth für alle Features der App. Es erfüllt zwei Zwecke:

1. **Onboarding** — Neue Developer (oder KI-Agenten) finden Entry Points und Key Files in unter 5 Minuten.
2. **Refactoring-Sicherheit** — Vor jedem Eingriff klar, welche Cross-cutting-Features ein Plugin berührt.

Verwandte Dokumente:

- `docs/DEPENDENCIES.md` — Abhängigkeitsgraph zwischen Features.
- `docs/auth/` — vertiefte Auth-Doku (Forward-Auth, TOTP, Passkeys).
- `docs/superpowers/specs/` — Architektur-Spec.
- `CLAUDE.md` — Projekt-Kontext für KI-Agenten (lebende Doku, kürzer).

## Versions-Schlüssel

| Version | Inhalt |
|---------|--------|
| v0.1.0  | MVP: sleep, feeding, diaper, child management |
| v0.2–0.4 | vitamind3, temperature, weight, medication, todo, tummytime |
| v0.5    | health (spit_up + tummy_ache), milestones (v1) |
| v0.6    | Auth-System (Sprint 12), User-Verwaltung (Sprint 13), API-Keys |
| v0.7    | Plugin "Wohlbefinden" (Rename), growth (WHO-Kurven), checkup (U-Untersuchungen), notes |
| v0.8    | Foto-System (Pillow + Thumbnails), Medienverwaltung (/admin/media), Markdown-Editor |
| v0.8+   | Sprint 26: Dashboard→Home, Auto-Nachtschlaf 22–06, /admin/logs |

## 1. Plugins (14)

Alle Plugins folgen dem Plugin-Architektur-Pattern (`backend/app/plugins/_base.py`, ADR-1). Sie werden zur Laufzeit über `backend/app/plugins/registry.py` automatisch geladen. Frontend-Definition in `frontend/src/lib/pluginRegistry.ts`.

| Key | Anzeigename | Kategorie | Base? | Backend-Modell | Backend-Router | Frontend-Page | Dashboard-Widget |
|-----|-------------|-----------|-------|----------------|----------------|---------------|------------------|
| sleep | Schlaf | tracking | ✅ | `plugins/sleep/models.py:SleepEntry` | `plugins/sleep/router.py` | `pages/SleepPage.tsx` | `plugins/sleep/SleepWidget.tsx` |
| feeding | Mahlzeiten | tracking | ✅ | `plugins/feeding/models.py:FeedingEntry` | `plugins/feeding/router.py` | `pages/FeedingPage.tsx` | `plugins/feeding/FeedingWidget.tsx` |
| diaper | Windeln | tracking | ✅ | `plugins/diaper/models.py:DiaperEntry` | `plugins/diaper/router.py` | `pages/DiaperPage.tsx` | `plugins/diaper/DiaperWidget.tsx` |
| temperature | Temperatur | tracking | – | `plugins/temperature/models.py:TemperatureEntry` | `plugins/temperature/router.py` | `pages/TemperaturePage.tsx` | `plugins/temperature/TemperatureWidget.tsx` |
| weight | Gewicht | tracking | – | `plugins/weight/models.py:WeightEntry` | `plugins/weight/router.py` | `pages/WeightPage.tsx` | `plugins/weight/WeightWidget.tsx` |
| medication | Medikament | tracking | – | `plugins/medication/models.py:MedicationEntry` | `plugins/medication/router.py` | `pages/MedicationPage.tsx` | `plugins/medication/MedicationWidget.tsx` |
| vitamind3 | Vitamin D3 | tracking | – | `plugins/vitamind3/models.py` | `plugins/vitamind3/router.py` | – (inline in BabySummary) | `plugins/vitamind3/VitaminD3Button.tsx` |
| health | Wohlbefinden | tracking | – | `plugins/health/models.py:HealthEntry` (typed: spit_up, tummy_ache, crying) | `plugins/health/router.py` | `pages/HealthPage.tsx` | `plugins/health/HealthWidget.tsx` |
| tummytime | Bauchlage | tracking | – | `plugins/tummytime/models.py:TummyTimeEntry` | `plugins/tummytime/router.py` | `pages/TummyTimePage.tsx` | `plugins/tummytime/TummyTimeWidget.tsx` |
| milestones | Meilensteine | development | – | `plugins/milestones/models.py` (5 Modelle) | `plugins/milestones/router.py` (5 Routers) | `pages/MilestonesPage.tsx` + `MilestonesTimelinePage.tsx` | `plugins/milestones/MilestonesWidget.tsx` |
| growth | Wachstum | development | – | uses `WeightEntry` + `TemperatureEntry` (read-only) | `plugins/growth/router.py` | – (inline auf WeightPage) | – (Charts in WeightPage) |
| checkup | U-Untersuchungen | development | – | `plugins/checkup/models.py:CheckupEntry` | `plugins/checkup/router.py` | `pages/CheckupPage.tsx` | `plugins/checkup/CheckupWidget.tsx` |
| todo | Tasks & Habits | productivity | – | `plugins/todo/models.py` (TodoEntry, TodoTemplate, Habit) | `plugins/todo/router.py` | `pages/TodoPage.tsx` | `plugins/todo/TodoWidget.tsx` |
| notes | Notizen | productivity | – | `plugins/notes/models.py:SharedNote` | `plugins/notes/router.py` | `pages/NotesPage.tsx` | – (eigenes NoteWidget im Dashboard) |

### Plugin-Detail-Spezifika

#### sleep
- Timer-basiert: "Jetzt starten" erstellt sofort DB-Eintrag mit `start=now, end=NULL`.
- `entry_type`: `nap` (Tagesschlaf) oder `night` (Nachtschlaf, Default 22–06 via Auto-Heuristik in `SleepForm.tsx`).
- Optional `location`: bed/carrier/stroller/car/other.

#### feeding
- `feeding_type`: breast_left/breast_right/bottle/solid.
- Stillmodus (User-Preference) blendet breast_left/breast_right aus, wenn deaktiviert.
- Kein Ende-Feld (entfernt nach UX-Feedback).

#### diaper
- `wet_state`: dry/wet, `dirty_state`: none/dirty.
- "Beides" = wet + dirty; "Trocken" = beides false.

#### milestones (komplex)
- 5 Tabellen: `MilestoneCategory`, `MilestoneTemplate`, `MilestoneEntry`, `MilestonePhoto`, `LeapDefinition`.
- Seed-Daten: 8 System-Kategorien, 107 Templates, 10 Wonder-Weeks-Sprünge.
- Frühgeborenen-Modus: Leap-Berechnung ab `child.estimated_birth_date` falls `is_preterm=True`.
- Foto-Pipeline: Pillow → Original ≤ 2048 px / 80 % JPEG, Thumbnail 400 px.
- Auth-Proxy `/api/v1/milestones/photos/{path}` (kein static mount).
- Max 3 Fotos pro Eintrag.

#### growth
- WHO-Perzentilen (P3/P15/P50/P85/P97) für Gewicht + Länge nach Geschlecht.
- Frühgeborenen-Kalibrierung über korrigiertes Alter (`useGrowth.ts`).
- Daten in `services/who_data.py`.

#### checkup
- U1–U9 Tracking mit Seed-Daten (`plugins/checkup/seed_data.py`).
- Kalender-Zeitfenster aus `birth_date` + `min_age_weeks`/`max_age_weeks` (inkl. Frühgeborenen-Anpassung).

## 2. Cross-cutting Backend-Features

| Feature | Entry Points | Key Files | Erläuterung |
|---------|--------------|-----------|-------------|
| Auth-System (4 Modi) | `app/api/auth.py`, `app/middleware/auth.py` | `app/models/user.py`, `app/schemas/auth.py`, `app/config.py` | Modi: `disabled`, `forward` (Authelia), `local` (JWT httpOnly Cookie + Argon2), `both`. Login: `POST /auth/login`, Logout: `POST /auth/logout`, Status: `GET /auth/me`. |
| 2FA (TOTP) | `app/api/totp.py` | `app/models/totp.py` | pyotp + qrcode[pil]. 8 Backup-Codes. Setup: `POST /auth/totp/setup`, Verify: `POST /auth/totp/verify`, Disable: `POST /auth/totp/disable`. |
| Passkeys (WebAuthn) | `app/api/webauthn.py` | `app/models/webauthn.py` | py_webauthn. Register/Login Begin+Finish. Credentials pro User verwaltbar. |
| API-Keys (M2M) | `app/api/api_keys.py`, `app/middleware/api_key_auth.py` | `app/models/api_key.py` | Argon2-Hash, Prefix-Matching (8 Zeichen), Scopes: read/write/admin. Schlüssel nur einmal sichtbar. |
| User-Verwaltung | `app/api/users.py` | `app/models/user.py` | Admin-only CRUD. Rollen: admin/caregiver. Set-Password-Endpoint. Zeitzone pro User. |
| User-Preferences | `app/api/preferences.py` | `app/models/user_preferences.py` | Serverseitig: breastfeeding_enabled, quick_actions, widget_order, track_visibility. Auto-Create bei erstem Zugriff. |
| Children-Management | `app/api/children.py` | `app/models/child.py` | Mehrere Kinder pro Account, aktives Kind via Selector. `is_preterm` + `estimated_birth_date`. |
| Tag-System (polymorph) | `app/api/tags.py` | `app/models/tag.py` (Tag, EntryTag) | EntryTag verbindet `entry_type + entry_id` (kein FK, polymorph). Felder: `is_archived`, `notes`, `created_at`. |
| Warnhinweise (Alerts) | `app/api/alerts.py`, `app/services/alert_service.py` | `app/models/alert_config.py` | Pro Kind konfigurierbar. 6 Regeln (Fütterung, Temp hoch/niedrig, Windel, Schlaf, Sturmphase). Altersfilter `min_age_weeks/max_age_weeks`. |
| Medikamenten-Stammdaten | `app/api/medication_masters.py` | `app/models/medication_master.py` | Master-Liste für Dropdown im MedicationForm. Felder: name, active_ingredient, default_unit. |
| Changelog | `app/routers/changelog.py` | `app/schemas/changelog.py` | Release-Notes-Verwaltung in `/admin/changelog`. Frontend zeigt `ChangelogOverlay` bei neuer Version. |
| Admin-Logs | `app/api/admin_logs.py` | `app/logging.py` | structlog JSON-Logs. List + Filter (Level), Download (NDJSON), Clear. UI: `pages/AdminLogsPage.tsx`. |
| Health-Check | `app/api/health.py` | – | `GET /health`. NICHT verwechseln mit health-Plugin (Wohlbefinden). |
| Security Middleware | `app/middleware/security.py` | – | Header-Stripping (K1), CSP-Header. Erste Middleware in der Chain. |
| CSRF | `app/middleware/csrf.py` | – | starlette-csrf, Double-Submit-Cookie (K2). |
| Rate Limiting | `app/middleware/rate_limit.py` | – | slowapi. |
| Logging | `app/logging.py` | `app/api/admin_logs.py` | structlog → JSON-NDJSON. Datei in `data/logs/`. |
| Database / Migrations | `app/database.py`, `backend/alembic/` | `alembic.ini` | SQLite WAL. Migrations-Kette dokumentiert in CLAUDE.md. |

## 3. Cross-cutting Frontend-Features

| Feature | Entry Points | Key Files | Erläuterung |
|---------|--------------|-----------|-------------|
| App-Routing | `frontend/src/App.tsx` | – | React-Router. Lazy-Imports pro Page. AuthGuard wrapped Layout. |
| Auth-Guard | `frontend/src/App.tsx:AuthGuard` | `frontend/src/hooks/useAuth.ts` | Reagiert auf authMode: disabled/forward → pass-through; local/both → LoginPage wenn !user. 401-Handler via `set401Handler` in `api/client.ts`. |
| Layout / Navigation | `frontend/src/components/Layout.tsx` | `Header.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `MobileMenu.tsx`, `FAB.tsx` | Sidebar fixed Desktop, BottomNav 4 fixe Items + Burger Mobile, FAB für Quick-Actions. |
| Dashboard | `frontend/src/pages/Dashboard.tsx` | `components/dashboard/BabySummary.tsx`, `DayTimeline.tsx`, `PatternChart.tsx`, `WeeklyReport.tsx` | Tab-Range (Heute/7T/14T) mit useSwipe. Widget-Grid dynamisch nach Plugin-Order. Tagesverlauf-Sichtbarkeit konfigurierbar (Zahnrad). |
| Plugin Registry | `frontend/src/lib/pluginRegistry.ts` | – | 14 Plugin-Definitionen (key, label, icon, route, isBase). |
| Plugin Config | `frontend/src/lib/pluginConfig.ts` | `pages/PluginConfigPage.tsx` | localStorage: aktive Plugins, Dashboard-Visibility, Widget-Order. Nav + Dashboard reagieren dynamisch. |
| Quick Actions | `frontend/src/lib/quickActions.ts` | `pages/AdminPage.tsx` | 3 konfigurierbare Favoriten (User-Preference). |
| Stillmodus | `frontend/src/lib/breastfeedingMode.ts` | – | localStorage Toggle. Bei off: "Letzte Flasche"-Tile + bottle Preset. Hybridmodus: beides parallel. |
| Children-Context | `frontend/src/context/ChildContext.tsx` | `hooks/useChildren.ts` | Globaler aktiver Kind-State. Persistenz via localStorage + Server-Preference. |
| ToastContext | `frontend/src/context/ToastContext.tsx` | `hooks/useToast` | Globale Toast-Notifications. |
| ErrorBoundary | `frontend/src/components/ErrorBoundary.tsx` | – | Globaler React-Error-Catch. Verhindert schwarze Screens bei Runtime-Fehlern. |
| Tag-System | `frontend/src/components/TagSelector.tsx`, `TagBadges.tsx` | `pages/TagsPage.tsx`, `TagDetailPage.tsx` | Bound (Edit) + pending (Create) Modus. Swipe auf TagDetailPage: links=archivieren, rechts=Tag entfernen. Suche durchsucht summary + notes. |
| Alerts (UI) | `frontend/src/components/AlertBanner.tsx`, `AlertBell.tsx` | `lib/alertDismiss.ts`, `hooks/useAlerts.ts` | Banner mit X-Button. 6h Dismiss via localStorage. Bell im Header zeigt Anzahl. |
| Admin-Hub | `frontend/src/pages/AdminPage.tsx` | – | Kachel-Navigation zu allen 10 Admin-Pages. Inline: Quick Actions, Stillmodus-Toggle, Hybridmodus. |
| Markdown-Editor | `frontend/src/components/MarkdownEditor.tsx` | `lib/markdown.ts` | Eigener Minimal-Parser (kein externes Dependency). Split-View Desktop, Toggle Mobile. |
| Foto-Upload | `frontend/src/plugins/milestones/PhotoSection.tsx` | `frontend/src/api/milestones.ts` | Galerie statt Kamera (kein `capture`). Skeleton-Loader, Lightbox, max 3 Fotos. |
| i18n | `frontend/src/i18n/` | `index.ts`, `locales/de/*.json`, `locales/en/*.json` | react-i18next, 15 Namespaces (common, sleep, …, admin). User-Locale serverseitig in `User.locale`, sync beim Login. |
| Theme | `frontend/src/components/ThemeToggle.tsx` | `index.css` | Catppuccin Latte (Light) / Macchiato (Dark) via CSS-Variablen. `--ground` statt `--base` (Tailwind-Konflikt). |
| Swipe-Gesten | `frontend/src/hooks/useSwipe.ts` | – | Threshold 50 px. Verwendet auf Dashboard-Tabs, Milestones-Tabs, TagDetailPage. |
| ChangelogOverlay | `frontend/src/components/ChangelogOverlay.tsx` | – | Modal beim App-Start, wenn Version > letzter im localStorage. |
| PWA | `frontend/public/manifest.json` | `frontend/public/icons/` | iOS-kompatibel (apple-touch-icon, standalone). 180/192/512 px PNG. |

## 4. Schlüsselverzeichnisse

| Pfad | Inhalt |
|------|--------|
| `backend/app/plugins/<name>/` | Plugin-Code: `__init__.py` (PluginClass), `models.py`, `router.py`, `widget.py`, `schemas.py`. |
| `backend/app/plugins/registry.py` | Auto-Discovery aller Plugins zum App-Start. |
| `backend/app/plugins/_base.py` | `PluginBase`, `WidgetDef` Abstraktionen. |
| `backend/app/api/` | Cross-cutting REST-Routes (auth, users, tags, alerts, admin_logs, …). |
| `backend/app/services/` | Domain-Services (alert_service, who_data). |
| `backend/app/middleware/` | security, auth, csrf, rate_limit, api_key_auth. |
| `backend/app/models/` | Cross-cutting SQLAlchemy-Modelle. |
| `backend/alembic/versions/` | Migrations-Kette (Datei-Reihenfolge in CLAUDE.md). |
| `frontend/src/plugins/<name>/` | Plugin-Frontend: Form, Widget, List, Modal. |
| `frontend/src/pages/` | Top-Level Pages (Routing-Targets in `App.tsx`). |
| `frontend/src/api/` | REST-Client pro Domäne. Basis: `client.ts`. |
| `frontend/src/hooks/` | Daten-Hooks (`useSleep`, `useDashboardData`, `useAuth`, `useSwipe`, …). |
| `frontend/src/lib/` | Utilities ohne React-Dependencies. |
| `frontend/src/components/` | Shared UI-Komponenten (Button, Card, Layout, TagSelector, …). |
| `data/` | SQLite-Datenbanken, Uploads, Logs. NICHT in Git (`.gitignore`). |
| `docs/auth/` | 9 Dateien zur Auth-Doku. |
| `docs/superpowers/` | Architektur-Spec + Implementierungspläne. |
| `docs/research/` | Externe Spec-Recherche. |

## 5. Wichtige Konventionen

Siehe `CLAUDE.md` für die vollständige Liste. Highlights für neue Developer:

- **Timestamps** sind UTC in der DB. `UTCDatetime` Type in `app/schemas/base.py` sendet ISO 8601 mit Z-Suffix.
- **Frontend** konvertiert UTC → Lokalzeit via `Intl.DateTimeFormat`.
- **Tailwind-Token** `ground` statt `base` (Konflikt mit `text-base`).
- **Touch-Targets** min 44 px, Inputs `font-size: 16px` gegen iOS-Zoom.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `security:`).
- **Tests**: `pytest` für Backend (httpx AsyncClient, In-Memory SQLite), Vitest + Testing Library für Frontend. Coverage-Ziel: Core > 80 %.
- **Vite-Proxy** darf NIE mit NAS-IP committet werden — vor jedem Push auf `http://localhost:8080` zurücksetzen.

## 6. Wartung dieses Dokuments

Diese Datei wird bei größeren Sprint-Abschlüssen aktualisiert. Verantwortlich: Coding Lead-Agent oder Scrum Master vor Sprint-Close. Quellen für Updates:

1. `frontend/src/lib/pluginRegistry.ts` (Plugin-Liste).
2. `backend/app/plugins/` Verzeichnisse (Plugin-Existenz).
3. `backend/app/api/` + `app/middleware/` (Cross-cutting Backend).
4. `frontend/src/components/`, `lib/`, `hooks/` (Cross-cutting Frontend).
5. `CLAUDE.md` (Sprint-Verlauf, Architektur-Entscheidungen).

Format-Regeln: Tabellen für Listen, kurze Sektionen für Details. Keine Roadmap-Inhalte (gehören ins DevD-Backlog).
