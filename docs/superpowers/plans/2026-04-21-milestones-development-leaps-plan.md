# Implementation Plan: Child Milestones & Development Leaps Plugin

## Metadata
- Erstellt: 2026-04-21
- Status: Draft
- Quelle: `500 CONTEXTS/Home Lab Wiki/20 - Projekte/MyBabyTracker/Requirements Dokument - Child Milestones & Development Leaps Plugin for Baby-Tracker App.md`
- Zusätzliche Quellen:
  - `BabyTracker-Events.md` (Emotionale Meilensteine, ~80 Einträge)
  - `BabyTracker-Sprünge.md` (10 Entwicklungssprünge nach Plooij)
- Architect Agent: Claude Opus 4.6 (Senior Architect)

## 1. Executive Summary

Neues Plugin "Milestones & Development" für den Baby-Tracker. Kombiniert drei Säulen:

1. **Klinische Meilensteine** — Motorik, Sprache, Kognition mit altersbasierten Vorschlägen (CDC/WHO-inspiriert)
2. **Emotionale Erinnerungen** — "Erste Male" (erster Zahn, erster Zoo-Besuch, etc.)
3. **Entwicklungssprünge** — Wonder-Weeks-inspirierte Leap-Phasen mit Sturm-/Sonnenphasen

**MVP-Scope**: Milestone-CRUD, Seed-Daten (~40 klinische + ~80 emotionale + 10 Leaps), Kategorie-System, Timeline-View, Leap-Kalender, Photo-Upload (einzeln), Dashboard-Widget, Suche.

**Phase 2** (explizit ausgeschlossen): Smart Guidance/Aktivitätsvorschläge, AI-Zusammenfassungen, Video-Upload, Jahresrückblick, Multi-Language Frameworks.

## 2. Requirement-Analyse

### Funktionale Anforderungen

| ID | Anforderung | Priorität | MVP |
|----|-------------|-----------|-----|
| FR-01 | Dedizierter Navigationsbereich "Meilensteine & Entwicklung" | Must | Ja |
| FR-02 | Altersbasierte Meilenstein-Vorschläge (aus Seed-Daten) | Must | Ja |
| FR-03 | Leap-Phasen-Tracking mit Sturm-/Sonnenphasen | Must | Ja |
| FR-04 | Milestone als erreicht markieren (Datum, Konfidenz, Notiz) | Must | Ja |
| FR-05 | Photo-Upload pro Meilenstein (einzeln) | Must | Ja |
| FR-06 | Emotionale Erinnerungen erfassen (Custom Milestones) | Must | Ja |
| FR-07 | Kategorie-System (8 Default + Custom) | Must | Ja |
| FR-08 | Timeline-View (Geburt → heute) | Must | Ja |
| FR-09 | Suche über Meilensteine | Must | Ja |
| FR-10 | Dashboard-Widget (aktuelle Phase + letzte Meilensteine) | Must | Ja |
| FR-11 | Filter nach Kategorie, Status, Zeitraum | Should | Ja |
| FR-12 | Dashboard Analytics (Fortschrittsringe, Kategorie-Verteilung) | Could | Nein |
| FR-13 | Smart Guidance / Aktivitätsvorschläge | Won't (MVP) | Nein |
| FR-14 | Video-Upload | Won't (MVP) | Nein |
| FR-15 | Jahresrückblick / Shareable Recap | Won't (MVP) | Nein |

### Nicht-funktionale Anforderungen

| ID | Anforderung | Umsetzung |
|----|-------------|-----------|
| NFR-01 | Emotionale Sicherheit — keine alarmistischen Formulierungen | Soft-Wording in Seed-Daten, kein "verspätet"-Label |
| NFR-02 | Privacy — alle Fotos lokal gespeichert | Filesystem-Storage im Container-Volume |
| NFR-03 | Performance — Timeline < 2s Ladezeit | Pagination + Lazy-Load für Bilder |
| NFR-04 | Ease of Use — Milestone loggen < 15 Sekunden | Quick-Complete-Flow: Tap → Datum → Done |
| NFR-05 | Sprünge als optionales Framework kennzeichnen | Disclaimer-Text, "observational" framing |

### Explizit ausgeschlossen (Out of Scope MVP)

- Korrigiertes Alter für Frühgeborene (aber `estimated_birth_date` Feld wird vorbereitet)
- Video-Upload
- AI-gestützte Zusammenfassungen
- Smart Guidance / Aktivitätsvorschläge
- Multi-Language Milestone-Frameworks
- Shareable Yearly Recap
- Dashboard Analytics mit Charts (Fortschrittsringe etc.)

### Offene Fragen / Annahmen

| # | Frage/Annahme | Entscheidung |
|---|---------------|--------------|
| A1 | Child-Model hat kein `estimated_birth_date` — Leaps basieren aber auf ET | Child-Model erweitern (optionales Feld), Fallback auf `birth_date` |
| A2 | Kein Photo-Upload-System existiert | Neues Upload-System mit lokaler Dateispeicherung einführen |
| A3 | Seed-Daten Sprache: Deutsch oder Englisch? | Deutsch (konsistent mit UI-Sprache der App) |
| A4 | Meilenstein-Vorschläge: global oder pro Kind? | Global (Seed-Daten), Completion-Status pro Kind |
| A5 | Leaps: exakte Berechnung oder manuelle Eingabe? | Automatische Berechnung basierend auf ET/birth_date |
| A6 | Kategorien: global oder pro Kind? | Global (System-Kategorien nicht löschbar) + Custom pro Kind |
| A7 | Branding: "Milestones & Development" oder deutscher Name? | "Meilensteine" (konsistent mit deutschsprachiger UI) |

## 3. Kontext-Analyse (Ist-Zustand)

### Relevante bestehende Module

| Modul | Pfad | Relevanz |
|-------|------|----------|
| Plugin-Base | `backend/app/plugins/_base.py` | PluginBase, WidgetDef — Pattern für neues Plugin |
| Plugin-Registry | `backend/app/plugins/registry.py` | Auto-Discovery, keine manuelle Registrierung nötig |
| Child Model | `backend/app/models/child.py` | `birth_date` vorhanden, `estimated_birth_date` fehlt |
| Tag System | `backend/app/models/tag.py` | Polymorphes Tagging — wiederverwendbar für Milestones |
| TimestampMixin | `backend/app/models/base.py` | `created_at` UTC — Standard für alle Models |
| Medication Plugin | `backend/app/plugins/medication/` | Referenz-Plugin (komplex, Master-Daten, FK) |
| Todo Plugin | `backend/app/plugins/todo/` | Referenz für Toggle-Status (completed/pending) |
| Frontend Plugin Registry | `frontend/src/lib/pluginRegistry.ts` | Plugin-Def mit key, label, icon, route, isBase |
| Frontend Plugin Config | `frontend/src/lib/pluginConfig.ts` | localStorage Toggle für optionale Plugins |
| TanStack React Query | `frontend/src/hooks/` | Standard-Pattern für API-Hooks |
| TagSelector/TagBadges | `frontend/src/components/` | Wiederverwendbar in Milestone-Forms |
| EntryDetailModal | `frontend/src/components/EntryDetailModal.tsx` | Erweiterbar um Milestone-Typ |
| BottomNav | `frontend/src/components/BottomNav.tsx` | Neuer NavItem für Meilensteine |
| DayTimeline | `frontend/src/components/dashboard/DayTimeline.tsx` | Anderes Konzept (Stunden), nicht wiederverwendbar |

### Wiederverwendbare Komponenten

- **TagSelector + TagBadges**: Direkt einsetzbar (entry_type = "milestone")
- **EntryDetailModal**: Erweiterbar um `case "milestone"` für Detail-Ansicht
- **DateRangeFilter**: Wiederverwendbar für Milestone-Liste
- **useToast**: Standard-Feedback-Pattern
- **apiFetch**: API-Layer Basis
- **BottomNav Plugin-Filtering**: isPluginEnabled-Pattern

### Identifizierte Lücken

| Lücke | Impact | Lösung |
|-------|--------|--------|
| Kein `estimated_birth_date` im Child-Model | Leap-Berechnung ungenau | Child-Model + Schema + Migration erweitern |
| Kein File-Upload-System | Fotos können nicht gespeichert werden | Neuer Upload-Endpoint + lokale Dateispeicherung |
| Keine Seed-Data-Infrastruktur | Vordefinierte Meilensteine müssen geladen werden | Seed-Script als CLI-Command oder Migration |
| Kein Timeline-Komponente (Monate/Jahre-Skala) | Klinische Timeline ≠ Tages-Timeline | Neue MilestoneTimeline-Komponente |
| Kein Image-Display in Cards/Listen | Fotos können nicht angezeigt werden | Thumbnail-Komponente, Lazy-Loading |

## 4. Architekturentscheidungen

### ADR-M1: Datenmodell-Trennung Vorlagen vs. Einträge

**Entscheidung**: Zwei getrennte Tabellen — `milestone_templates` (Seed-Vorlagen) und `milestone_entries` (Kind-spezifische Einträge).

**Kontext**: Meilenstein-Vorschläge sind global (WHO/CDC-inspiriert), aber der Completion-Status ist pro Kind. Custom-Meilensteine haben keine Vorlage.

**Alternativen**:
- A) Eine Tabelle mit `is_template` Flag → Komplexe Queries, Seed-Daten mischen sich mit User-Daten
- B) Vorlagen inline als JSON → Kein DB-Querying auf Vorlagen möglich

**Begründung**: Saubere Trennung erlaubt unabhängige Seed-Data-Updates, einfaches Querying ("welche Vorlagen hat das Kind noch nicht erreicht?"), und Custom-Meilensteine ohne Template-FK.

### ADR-M2: Leap-Phasen als berechnete Daten

**Entscheidung**: Leap-Definitionen als Seed-Daten in `leap_definitions` Tabelle. Leap-Status (aktiv, vergangen, kommend) wird zur Laufzeit berechnet basierend auf `estimated_birth_date` (Fallback: `birth_date`).

**Kontext**: 10 Leaps mit festen Wochen-Offsets ab ET. Kein User-Input nötig — rein datengetrieben.

**Alternativen**:
- A) Leaps als JSON-Datei im Frontend → Keine DB-Abfragen, kein Backend-Involvement
- B) Leaps pro Kind in DB materialisieren → Redundante Daten, Sync-Problem bei Seed-Updates

**Begründung**: DB-Tabelle ermöglicht spätere Erweiterung (z.B. Custom-Leaps, Notizen pro Leap pro Kind), API kann berechneten Status mitliefern, Frontend bleibt dünn.

### ADR-M3: Photo-Upload als lokale Dateispeicherung

**Entscheidung**: Photos werden als Dateien im Container-Volume gespeichert (`data/uploads/milestones/{child_id}/{uuid}.{ext}`). Metadaten in `milestone_photos` Tabelle. Auslieferung über statischen FastAPI-Mount.

**Kontext**: Self-hosted App, kein S3/Cloud-Speicher gewünscht. Photos sind privacy-sensitiv.

**Alternativen**:
- A) Base64 in SQLite → DB-Bloat, Performance-Probleme
- B) S3-kompatibel (MinIO) → Over-Engineering für Single-Family-App

**Begründung**: Einfachste Lösung, konsistent mit Container-Volume-Pattern (`data/`), performant durch Static-File-Serving, Backup über vorhandenes NAS-Volume-Backup.

### ADR-M4: Kategorien als System-Tabelle

**Entscheidung**: `milestone_categories` Tabelle mit `is_system` Flag. 8 System-Kategorien (nicht löschbar) + beliebig viele Custom-Kategorien pro Kind.

**Kontext**: Requirement definiert 8 Default-Kategorien. User soll eigene erstellen können.

**Alternativen**:
- A) Enum im Code → Keine Custom-Kategorien möglich
- B) Reine Kind-Kategorien → Seed-Daten können nicht referenzieren

**Begründung**: System-Kategorien werden bei Seed einmal angelegt und sind global. Custom-Kategorien haben `child_id` FK. Farben aus Catppuccin-Palette.

### ADR-M5: Seed-Daten via Alembic Data-Migration

**Entscheidung**: Seed-Daten (Meilenstein-Vorlagen, Leap-Definitionen, System-Kategorien) werden in einer eigenen Alembic-Migration eingespielt — nicht in App-Startup.

**Kontext**: ~130 Seed-Einträge (40 klinische + 80 emotionale Meilensteine + 10 Leaps + 8 Kategorien). Müssen genau einmal eingespielt werden.

**Alternativen**:
- A) App-Startup mit "INSERT IF NOT EXISTS" → Jeder Start prüft 130 Einträge
- B) CLI-Command `seed-milestones` → Manueller Schritt, kann vergessen werden

**Begründung**: Alembic-Migrationen laufen automatisch bei Container-Start (`alembic upgrade head` in main.py Lifespan). Idempotent, versioniert, nachvollziehbar.

### ADR-M6: Estimated Birth Date als optionales Child-Feld

**Entscheidung**: `estimated_birth_date` (Date, nullable) zum Child-Model hinzufügen. Leap-Berechnung nutzt `estimated_birth_date ?? birth_date`.

**Kontext**: Plooij-Sprünge basieren auf errechneten Geburtstermin, nicht tatsächlichem. Für die meisten Familien ist der Unterschied gering, aber für Frühchen relevant.

**Begründung**: Minimaler Schema-Change, vorbereitet für spätere Frühchen-Unterstützung, saubere Leap-Berechnung.

## 5. Zielarchitektur (Soll-Zustand)

### Komponentendiagramm

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ MilestonePage │  │ LeapCalendar │  │ Milestone  │ │
│  │  (Timeline +  │  │  (Sprünge-   │  │  Widget    │ │
│  │   List View)  │  │   Ansicht)   │  │ (Dashboard)│ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                  │                │        │
│  ┌──────┴──────────────────┴────────────────┴──────┐ │
│  │           useMilestones / useLeaps              │ │
│  │           (TanStack React Query Hooks)          │ │
│  └──────────────────────┬──────────────────────────┘ │
│                         │                            │
│  ┌──────────────────────┴──────────────────────────┐ │
│  │              api/milestones.ts                   │ │
│  │              api/leaps.ts                        │ │
│  └──────────────────────┬──────────────────────────┘ │
└─────────────────────────┼────────────────────────────┘
                          │ HTTP
┌─────────────────────────┼────────────────────────────┐
│                    Backend                            │
│                         │                            │
│  ┌──────────────────────┴──────────────────────────┐ │
│  │         plugins/milestones/router.py            │ │
│  │  /api/v1/milestones/*   /api/v1/leaps/*        │ │
│  │  /api/v1/milestone-categories/*                 │ │
│  │  /api/v1/uploads/milestones/*                   │ │
│  └──────────────────────┬──────────────────────────┘ │
│                         │                            │
│  ┌──────────────────────┴──────────────────────────┐ │
│  │         plugins/milestones/models.py            │ │
│  │  MilestoneTemplate | MilestoneEntry             │ │
│  │  MilestoneCategory | MilestonePhoto             │ │
│  │  LeapDefinition    | LeapNote (Phase 2)         │ │
│  └──────────────────────┬──────────────────────────┘ │
│                         │                            │
│  ┌──────────────────────┴──────────────────────────┐ │
│  │              SQLite (WAL)                       │ │
│  │  milestone_templates | milestone_entries        │ │
│  │  milestone_categories | milestone_photos        │ │
│  │  leap_definitions                               │ │
│  │  children (+ estimated_birth_date)              │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  data/uploads/milestones/{child_id}/{uuid}.ext  │ │
│  │  (Static File Mount)                            │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Datenmodell-Erweiterungen

#### Child (Erweiterung)
```
children
  + estimated_birth_date  DATE  NULL
```

#### milestone_categories
```
id                  INTEGER PK AUTOINCREMENT
name                VARCHAR(100) NOT NULL
color               VARCHAR(7) DEFAULT '#8839ef'
icon                VARCHAR(50) NULL          -- Lucide Icon Name
is_system           BOOLEAN DEFAULT FALSE
child_id            INTEGER NULL FK→children  -- NULL = System-Kategorie
UNIQUE(name, child_id)                        -- child_id NULL = global unique
```

#### milestone_templates (Seed-Vorlagen)
```
id                  INTEGER PK AUTOINCREMENT
title               VARCHAR(200) NOT NULL
description         TEXT NULL
category_id         INTEGER FK→milestone_categories
source_type         VARCHAR(20) NOT NULL      -- 'medical', 'emotional', 'leap'
suggested_age_weeks_min  INTEGER NULL         -- Mindestalter in Wochen
suggested_age_weeks_max  INTEGER NULL         -- Maximalalter in Wochen
sort_order          INTEGER DEFAULT 0
created_at          DATETIME UTC
```

#### milestone_entries (Kind-spezifische Einträge)
```
id                  INTEGER PK AUTOINCREMENT
child_id            INTEGER NOT NULL FK→children CASCADE
template_id         INTEGER NULL FK→milestone_templates  -- NULL = Custom
title               VARCHAR(200) NOT NULL
category_id         INTEGER NOT NULL FK→milestone_categories
source_type         VARCHAR(20) NOT NULL      -- 'medical', 'emotional', 'custom'
completed           BOOLEAN DEFAULT FALSE
completed_date      DATE NULL
confidence          VARCHAR(20) DEFAULT 'exact'  -- 'exact', 'approximate', 'unsure'
notes               TEXT NULL
created_at          DATETIME UTC
INDEX(child_id)
INDEX(child_id, completed)
INDEX(child_id, category_id)
INDEX(child_id, completed_date)
```

#### milestone_photos
```
id                  INTEGER PK AUTOINCREMENT
milestone_entry_id  INTEGER NOT NULL FK→milestone_entries CASCADE
file_path           VARCHAR(500) NOT NULL     -- Relativer Pfad ab data/uploads/
file_name           VARCHAR(200) NOT NULL     -- Original-Dateiname
file_size           INTEGER NOT NULL          -- Bytes
mime_type           VARCHAR(50) NOT NULL
created_at          DATETIME UTC
INDEX(milestone_entry_id)
```

#### leap_definitions (Seed-Daten)
```
id                  INTEGER PK AUTOINCREMENT
leap_number         INTEGER NOT NULL UNIQUE   -- 1-10
title               VARCHAR(200) NOT NULL
description         TEXT NOT NULL
storm_start_weeks   FLOAT NOT NULL            -- Wochen post ET
storm_end_weeks     FLOAT NOT NULL
sun_start_weeks     FLOAT NOT NULL
new_skills          TEXT NULL                  -- JSON Array von Strings
storm_signs         TEXT NULL                  -- JSON Array von Strings
sort_order          INTEGER DEFAULT 0
created_at          DATETIME UTC
```

### API-Schnittstellen

#### Milestones
```
POST   /api/v1/milestones/                    → MilestoneEntry erstellen
GET    /api/v1/milestones/                    → Liste (Filter: child_id, category_id, completed, source_type)
GET    /api/v1/milestones/{id}                → Einzelner Eintrag
PATCH  /api/v1/milestones/{id}                → Update
DELETE /api/v1/milestones/{id}                → Löschen
POST   /api/v1/milestones/{id}/complete       → Quick-Complete (Datum + optional Notiz)
POST   /api/v1/milestones/{id}/photo          → Photo-Upload (multipart/form-data)
DELETE /api/v1/milestones/{id}/photo/{photo_id} → Photo löschen
```

#### Milestone Templates (Read-only für UI)
```
GET    /api/v1/milestone-templates/           → Alle Vorlagen (Filter: category_id, source_type)
GET    /api/v1/milestone-templates/suggestions → Altersbasierte Vorschläge (child_id → berechnet pending)
```

#### Milestone Categories
```
GET    /api/v1/milestone-categories/          → Alle (System + Custom für Kind)
POST   /api/v1/milestone-categories/          → Custom-Kategorie erstellen
PATCH  /api/v1/milestone-categories/{id}      → Update (nur Custom)
DELETE /api/v1/milestone-categories/{id}      → Löschen (nur Custom, nur wenn keine Entries)
```

#### Leaps
```
GET    /api/v1/leaps/                         → Alle Leap-Definitionen
GET    /api/v1/leaps/status                   → Aktueller Status für Kind (child_id → berechnet aktiv/vergangen/kommend)
```

#### Uploads (Static Mount)
```
GET    /uploads/milestones/{child_id}/{filename}  → Static File Serving
```

### UI-/Navigationsstruktur

```
BottomNav → "Mehr"-Menü → "Meilensteine"
                          → /milestones

/milestones
  ├── Tab: Übersicht (Default)
  │   ├── Aktuelle Leap-Phase (Card, wenn aktiv)
  │   ├── Nächste Meilensteine (altersbasiert, max 5)
  │   └── Letzte erreichte Meilensteine (max 5)
  │
  ├── Tab: Timeline
  │   └── Chronologische Ansicht: Geburt → Heute
  │       ├── Monat-Marker
  │       ├── Erreichte Meilensteine (mit Foto-Thumbnail)
  │       ├── Leap-Phasen (farbige Bereiche)
  │       └── Jump-to-Age Navigation
  │
  ├── Tab: Alle Meilensteine
  │   ├── Filter: Kategorie, Status, Zeitraum
  │   ├── Liste mit Inline-Edit
  │   └── "Neuer Meilenstein" Button
  │
  └── Tab: Sprünge
      ├── Leap-Kalender (10 Sprünge als Cards)
      ├── Aktueller Sprung hervorgehoben
      ├── Sturm-/Sonnenphasen-Indikator
      └── Details: Neue Fähigkeiten, Anzeichen

/milestones/new           → Neuer Meilenstein (Form)
/milestones/{id}          → Detail-Ansicht mit Fotos
/milestones/{id}/edit     → Bearbeiten
```

## 6. Implementierungsplan (sequenziell)

### Step 1: Child-Model erweitern (estimated_birth_date)

- **Ziel**: Feld `estimated_birth_date` zum Child-Model + Schema + API hinzufügen
- **Betroffene Dateien/Module**:
  - `backend/app/models/child.py`
  - `backend/app/schemas/child.py`
  - `backend/alembic/versions/` (neue Migration)
  - `frontend/src/api/types.ts` (Child-Interface)
  - `frontend/src/` (Child-Verwaltungs-UI, falls vorhanden)
- **Vorgehen**:
  1. Column `estimated_birth_date = Column(Date, nullable=True)` zum Child-Model
  2. Pydantic-Schema ChildUpdate erweitern
  3. Alembic-Migration generieren
  4. Frontend-Typ erweitern
  5. Verwaltungs-UI: optionales Feld "Errechneter Geburtstermin" im Child-Form
- **Abhängigkeiten**: Keine
- **Akzeptanzkriterien**:
  - [x] Migration läuft fehlerfrei
  - [x] API akzeptiert `estimated_birth_date` bei Child-Update
  - [x] Feld in Child-Verwaltung editierbar
  - [x] Bestehende Kinder funktionieren ohne ET
- **Teststrategie**: Unit-Test für Migration, API-Test für PATCH /children/{id}

### Step 2: Backend-Plugin Grundstruktur + Datenmodell

- **Ziel**: Plugin-Skeleton mit allen Models, leere Router
- **Betroffene Dateien/Module**:
  - `backend/app/plugins/milestones/__init__.py`
  - `backend/app/plugins/milestones/models.py`
  - `backend/app/plugins/milestones/schemas.py`
  - `backend/app/plugins/milestones/router.py`
  - `backend/app/plugins/milestones/widget.py`
  - `backend/alembic/versions/` (neue Migration)
- **Vorgehen**:
  1. Plugin-Verzeichnis anlegen
  2. Models definieren: MilestoneCategory, MilestoneTemplate, MilestoneEntry, MilestonePhoto, LeapDefinition
  3. Pydantic-Schemas: Create/Update/Response für alle Entities
  4. Leere Router mit Prefix `/api/v1/milestones`, `/api/v1/leaps`, `/api/v1/milestone-categories`, `/api/v1/milestone-templates`
  5. PluginBase-Klasse: `MilestonesPlugin`
  6. Alembic-Migration für alle 5 Tabellen
  7. Widget-Definition (Placeholder)
- **Abhängigkeiten**: Step 1
- **Akzeptanzkriterien**:
  - [x] Plugin wird von Registry auto-discovered
  - [x] Alle 5 Tabellen werden bei Migration erstellt
  - [x] `alembic upgrade head` fehlerfrei
  - [x] App startet mit neuem Plugin
- **Teststrategie**: Startup-Test (App startet), Migration-Test

### Step 3: Seed-Daten (Kategorien, Meilenstein-Vorlagen, Leap-Definitionen)

- **Ziel**: Alle ~130 Seed-Einträge via Alembic-Migration einspielen
- **Betroffene Dateien/Module**:
  - `backend/app/plugins/milestones/seed_data.py` (Daten als Python-Dicts)
  - `backend/alembic/versions/` (Data-Migration)
- **Vorgehen**:
  1. `seed_data.py` mit drei Dicts erstellen:
     - `SYSTEM_CATEGORIES`: 8 Kategorien mit Namen, Farben (Catppuccin), Icons
       - Grobmotorik (sapphire), Feinmotorik (blue), Sprache (lavender), Kognition (mauve), Soziales (pink), Gesundheit (green), Familienerinnerungen (peach), Sprünge (yellow)
     - `MILESTONE_TEMPLATES`: ~120 Vorlagen aus BabyTracker-Events.md + BabyTracker-Sprünge.md
       - Klinische: ~40 (Motorik grob, Motorik fein, Sprache, Soziales/Kognition)
       - Emotionale: ~80 (aus Events-Dokument, alle Lebensphasen)
     - `LEAP_DEFINITIONS`: 10 Sprünge mit Wochen, Titel, Beschreibung, Fähigkeiten, Anzeichen
  2. Alembic Data-Migration: `op.bulk_insert()` für alle Tabellen
  3. Downgrade: `op.execute("DELETE FROM ... WHERE is_system=1")` etc.
- **Abhängigkeiten**: Step 2
- **Akzeptanzkriterien**:
  - [x] 8 System-Kategorien in DB
  - [x] ~120 Milestone-Templates in DB
  - [x] 10 Leap-Definitionen in DB
  - [x] Alle Templates haben gültige Kategorie-FK
  - [x] Downgrade entfernt alle Seed-Daten sauber
- **Teststrategie**: Migration-Test, Count-Assertions

### Step 4: Backend CRUD — Milestone Categories

- **Ziel**: Vollständiger CRUD für Kategorien (System read-only, Custom CRUD)
- **Betroffene Dateien/Module**:
  - `backend/app/plugins/milestones/router.py` (Category-Endpoints)
  - `backend/app/plugins/milestones/schemas.py` (CategoryCreate/Response)
- **Vorgehen**:
  1. GET `/api/v1/milestone-categories/` — Alle System-Kategorien + Custom-Kategorien des Kindes
  2. POST `/api/v1/milestone-categories/` — Custom-Kategorie (child_id Pflicht)
  3. PATCH `/api/v1/milestone-categories/{id}` — Nur Custom (is_system=False)
  4. DELETE `/api/v1/milestone-categories/{id}` — Nur Custom, nur wenn keine Entries
- **Abhängigkeiten**: Step 3
- **Akzeptanzkriterien**:
  - [x] System-Kategorien nicht lösch-/editierbar
  - [x] Custom-Kategorien CRUD funktional
  - [x] Löschen mit referenzierten Entries gibt 409 Conflict
- **Teststrategie**: pytest — CRUD-Tests, Schutz-Tests für System-Kategorien

### Step 5: Backend CRUD — Milestone Templates (Read-only + Suggestions)

- **Ziel**: API für Vorlagen-Abfrage und altersbasierte Vorschläge
- **Betroffene Dateien/Module**:
  - `backend/app/plugins/milestones/router.py` (Template-Endpoints)
  - `backend/app/plugins/milestones/schemas.py` (TemplateResponse, SuggestionResponse)
- **Vorgehen**:
  1. GET `/api/v1/milestone-templates/` — Alle Vorlagen (Filter: category_id, source_type)
  2. GET `/api/v1/milestone-templates/suggestions?child_id=X` — Berechnung:
     - Kind-Alter in Wochen berechnen (aus birth_date)
     - Templates filtern: `suggested_age_weeks_min <= alter <= suggested_age_weeks_max + 4 Wochen Puffer`
     - Bereits erreichte Templates (via MilestoneEntry mit template_id + child_id) ausschließen
     - Response: Template + `is_completed` + `is_upcoming` + `is_current` Status
- **Abhängigkeiten**: Step 3
- **Akzeptanzkriterien**:
  - [x] Templates nach Kategorie filterbar
  - [x] Suggestions liefern altersgerechte, noch nicht erreichte Meilensteine
  - [x] Bereits erreichte Meilensteine sind als completed markiert
- **Teststrategie**: pytest — Suggestions mit verschiedenen Altersgruppen, Edge Cases (Neugeborenes, 2 Jahre)

### Step 6: Backend CRUD — Milestone Entries

- **Ziel**: Vollständiger CRUD für Meilenstein-Einträge inkl. Quick-Complete
- **Betroffene Dateien/Module**:
  - `backend/app/plugins/milestones/router.py` (Entry-Endpoints)
  - `backend/app/plugins/milestones/schemas.py` (EntryCreate/Update/Response)
- **Vorgehen**:
  1. POST `/api/v1/milestones/` — Erstellen (mit oder ohne template_id)
  2. GET `/api/v1/milestones/?child_id=X` — Liste mit Filtern (category_id, completed, source_type, date_from, date_to)
  3. GET `/api/v1/milestones/{id}` — Einzeln (inkl. Photos, Tags)
  4. PATCH `/api/v1/milestones/{id}` — Partial Update
  5. DELETE `/api/v1/milestones/{id}` — Löschen (cascade Photos)
  6. POST `/api/v1/milestones/{id}/complete` — Quick-Complete: `{completed_date, confidence?, notes?}`
  7. Tag-Integration: entry_type = "milestone" für polymorphes Tagging
- **Abhängigkeiten**: Step 4, Step 5
- **Akzeptanzkriterien**:
  - [x] CRUD vollständig funktional
  - [x] Quick-Complete setzt completed=True + completed_date
  - [x] Filter nach Kategorie, Status, Source-Type, Zeitraum
  - [x] Tags über polymorphes System anknüpfbar
  - [x] Pydantic-Validation: max_length auf allen String-Feldern
- **Teststrategie**: pytest — CRUD, Quick-Complete, Filter-Kombinationen, Validation

### Step 7: Backend — Photo-Upload

- **Ziel**: Multipart Photo-Upload + Static-File-Serving für Milestone-Fotos
- **Betroffene Dateien/Module**:
  - `backend/app/plugins/milestones/router.py` (Upload-Endpoints)
  - `backend/app/plugins/milestones/schemas.py` (PhotoResponse)
  - `backend/app/main.py` (Static Mount)
  - `data/uploads/` (Verzeichnis)
- **Vorgehen**:
  1. POST `/api/v1/milestones/{id}/photo` — multipart/form-data
     - Validierung: nur image/* MIME-Types, max 10 MB
     - Speicherung: `data/uploads/milestones/{child_id}/{uuid}.{ext}`
     - Thumbnail-Generierung: Optional (Phase 2), vorerst Original servieren
  2. DELETE `/api/v1/milestones/{id}/photo/{photo_id}` — DB-Eintrag + Datei löschen
  3. Static Mount in main.py: `app.mount("/uploads", StaticFiles(directory="data/uploads"), name="uploads")`
  4. Photo-URL im MilestoneResponse: `/uploads/milestones/{child_id}/{filename}`
- **Abhängigkeiten**: Step 6
- **Akzeptanzkriterien**:
  - [x] Upload JPEG/PNG/WebP bis 10 MB
  - [x] Datei im Volume gespeichert
  - [x] URL im Response aufrufbar
  - [x] Löschen entfernt DB-Eintrag + Datei
  - [x] Ungültige MIME-Types werden mit 400 abgelehnt
- **Teststrategie**: pytest — Upload mit Testbild, MIME-Validation, Delete + Filesystem-Check

### Step 8: Backend — Leap Status API

- **Ziel**: API für Leap-Definitionen mit berechnetem Status pro Kind
- **Betroffene Dateien/Module**:
  - `backend/app/plugins/milestones/router.py` (Leap-Endpoints)
  - `backend/app/plugins/milestones/schemas.py` (LeapResponse, LeapStatusResponse)
- **Vorgehen**:
  1. GET `/api/v1/leaps/` — Alle 10 Leap-Definitionen
  2. GET `/api/v1/leaps/status?child_id=X` — Berechnung:
     - ET = `child.estimated_birth_date ?? child.birth_date`
     - Alter in Wochen = `(today - ET).days / 7`
     - Pro Leap: Status berechnen (past/active_storm/active_sun/upcoming/far_future)
     - Aktuellen Leap hervorheben
     - Nächsten Leap mit erwarteten Daten berechnen
  3. Response enthält: Leap-Info + berechnete Daten + Status + Kalender-Wochen
- **Abhängigkeiten**: Step 3, Step 1
- **Akzeptanzkriterien**:
  - [x] Status-Berechnung korrekt für verschiedene Altersgruppen
  - [x] Fallback auf birth_date wenn kein estimated_birth_date
  - [x] Kalender-Daten (Start/Ende) als ISO-Dates im Response
  - [x] Aktiver Leap korrekt identifiziert
- **Teststrategie**: pytest — Parametrisierte Tests mit verschiedenen Geburtsdaten, ET vs. birth_date Fallback

### Step 9: Backend — Tests (vollständige Coverage)

- **Ziel**: Alle Backend-Endpoints mit Tests abdecken
- **Betroffene Dateien/Module**:
  - `backend/tests/plugins/test_milestones.py`
  - `backend/tests/plugins/test_milestone_categories.py`
  - `backend/tests/plugins/test_milestone_templates.py`
  - `backend/tests/plugins/test_leaps.py`
  - `backend/tests/plugins/test_milestone_photos.py`
- **Vorgehen**:
  1. Fixtures: Test-Kind mit birth_date + estimated_birth_date
  2. Category-Tests: System-Schutz, Custom CRUD
  3. Template-Tests: Listing, Filter, Suggestions
  4. Entry-Tests: CRUD, Quick-Complete, Filter, Tags
  5. Photo-Tests: Upload, Serve, Delete, Validation
  6. Leap-Tests: Status-Berechnung, Edge Cases
- **Abhängigkeiten**: Steps 4-8
- **Akzeptanzkriterien**:
  - [x] > 80% Coverage auf Plugin-Code
  - [x] Alle Endpoints positiv + negativ getestet
  - [x] Edge Cases: leere DB, Kind ohne Entries, ungültige IDs
- **Teststrategie**: pytest mit httpx AsyncClient, In-Memory SQLite

### Step 10: Frontend — API-Layer + Types + Hooks

- **Ziel**: TypeScript Types, API-Funktionen, React-Query Hooks
- **Betroffene Dateien/Module**:
  - `frontend/src/api/types.ts` (neue Interfaces)
  - `frontend/src/api/milestones.ts` (API-Calls)
  - `frontend/src/api/leaps.ts` (API-Calls)
  - `frontend/src/hooks/useMilestones.ts` (CRUD Hooks)
  - `frontend/src/hooks/useLeaps.ts` (Query Hooks)
- **Vorgehen**:
  1. Types: MilestoneEntry, MilestoneTemplate, MilestoneCategory, MilestonePhoto, LeapDefinition, LeapStatus
  2. API: listMilestones, createMilestone, updateMilestone, deleteMilestone, completeMilestone, uploadPhoto, deletePhoto, listTemplates, getSuggestions, listCategories, getLeapStatus
  3. Hooks: useMilestoneEntries, useCreateMilestone, useCompleteMilestone, useUploadPhoto, useMilestoneTemplates, useSuggestions, useMilestoneCategories, useLeapStatus
- **Abhängigkeiten**: Steps 4-8 (Backend-Endpoints müssen existieren)
- **Akzeptanzkriterien**:
  - [x] Alle Types matchen Backend-Schemas
  - [x] Hooks invalidieren korrekt bei Mutations
  - [x] Error-Handling konsistent mit bestehenden Hooks
- **Teststrategie**: TypeScript-Kompilierung, manuelle API-Tests

### Step 11: Frontend — Plugin-Registrierung + Routing

- **Ziel**: Plugin in Registry, Routing, Navigation eintragen
- **Betroffene Dateien/Module**:
  - `frontend/src/lib/pluginRegistry.ts`
  - `frontend/src/App.tsx` (Route)
  - `frontend/src/components/BottomNav.tsx` (NavItem)
  - `frontend/src/pages/MilestonesPage.tsx` (Wrapper)
- **Vorgehen**:
  1. Plugin-Registry: `{ key: "milestones", label: "Meilensteine", icon: Star, route: "/milestones", isBase: false }`
  2. App.tsx: Lazy-loaded Route `/milestones`
  3. BottomNav: NavItem im "Mehr"-Menü mit pluginKey "milestones"
  4. MilestonesPage: Wrapper mit Tabs (Übersicht, Timeline, Alle, Sprünge)
- **Abhängigkeiten**: Keine (kann parallel zu Steps 4-9)
- **Akzeptanzkriterien**:
  - [x] Plugin in "Mehr"-Menü sichtbar
  - [x] Route /milestones erreichbar
  - [x] Plugin ein-/ausschaltbar in Verwaltung
  - [x] Tab-Navigation funktional
- **Teststrategie**: Vitest — Route-Rendering, Plugin-Toggle

### Step 12: Frontend — Milestone-Liste + Filter

- **Ziel**: Liste aller Meilensteine mit Filtern und Inline-Edit
- **Betroffene Dateien/Module**:
  - `frontend/src/plugins/milestones/MilestonesList.tsx`
  - `frontend/src/plugins/milestones/MilestoneCard.tsx`
- **Vorgehen**:
  1. MilestonesList: Filterable Liste (Kategorie-Dropdown, Status-Toggle, DateRange)
  2. MilestoneCard: Kompakte Card mit Titel, Kategorie-Badge, Datum, Foto-Thumbnail, Tags
  3. Inline-Edit: Klick → Form unter dem Eintrag expandieren (konsistent mit Inline-Edit Pattern)
  4. Quick-Complete: Checkbox-Toggle setzt completed + Datum
  5. "Neuer Meilenstein" FAB-Button
  6. Empty-State für keine Meilensteine
- **Abhängigkeiten**: Step 10, Step 11
- **Akzeptanzkriterien**:
  - [x] Filter nach Kategorie, Status funktional
  - [x] Quick-Complete < 2 Taps
  - [x] Foto-Thumbnails laden (Lazy)
  - [x] Inline-Edit konsistent mit bestehendem Pattern
  - [x] Touch-Targets ≥ 44px
- **Teststrategie**: Vitest — Rendering, Filter-Logic; Manuell: Touch, Performance

### Step 13: Frontend — Milestone-Formular

- **Ziel**: Form zum Erstellen/Bearbeiten von Meilensteinen (Custom + Template-basiert)
- **Betroffene Dateien/Module**:
  - `frontend/src/plugins/milestones/MilestoneForm.tsx`
- **Vorgehen**:
  1. Felder: Titel (autofill bei Template), Kategorie (Dropdown), Datum, Konfidenz (exact/approximate/unsure), Notiz, Tags (TagSelector pending-Modus)
  2. Template-Modus: Wenn aus Suggestion erstellt, Titel + Kategorie vorbefüllt, template_id gesetzt
  3. Custom-Modus: Alle Felder leer, source_type = "custom"
  4. Photo-Upload: Datei-Input mit Vorschau, Upload nach Entry-Erstellung
  5. Validation: Titel Pflicht, Datum Pflicht wenn completed
  6. Button-Text: "Eintragen" / "Aktualisieren" (konsistent)
- **Abhängigkeiten**: Step 10
- **Akzeptanzkriterien**:
  - [x] Erstellen + Bearbeiten funktional
  - [x] Template-Vorausfüllung korrekt
  - [x] Photo-Upload + Vorschau
  - [x] TagSelector im pending-Modus bei Create
  - [x] Font-size 16px auf allen Inputs (kein iOS-Zoom)
- **Teststrategie**: Vitest — Form-Rendering, Validation; Manuell: iOS-Test

### Step 14: Frontend — Übersichts-Tab (Suggestions + aktuelle Leaps)

- **Ziel**: Landing-View mit altersbasierten Vorschlägen und aktuellem Leap-Status
- **Betroffene Dateien/Module**:
  - `frontend/src/plugins/milestones/MilestonesOverview.tsx`
  - `frontend/src/plugins/milestones/LeapStatusCard.tsx`
  - `frontend/src/plugins/milestones/SuggestionCard.tsx`
- **Vorgehen**:
  1. LeapStatusCard: Aktuelle Leap-Phase anzeigen (wenn aktiv)
     - Sturm/Sonne-Indikator (farbcodiert)
     - Titel, Beschreibung, neue Fähigkeiten
     - Soft-Wording: "Viele Kinder erleben in dieser Phase..."
  2. SuggestionCards: Top 5 altersbasierte Vorschläge
     - Quick-Complete Button
     - Kategorie-Badge + Icon
     - Altersrange als Label
  3. Recent Achievements: Letzte 5 erreichte Meilensteine mit Foto-Thumbnail
  4. Disclaimer-Text: "Jedes Kind entwickelt sich in eigenem Tempo"
- **Abhängigkeiten**: Step 10, Step 11
- **Akzeptanzkriterien**:
  - [x] Leap-Status korrekt berechnet und angezeigt
  - [x] Suggestions altersgerecht
  - [x] Quick-Complete funktional
  - [x] Soft-Wording durchgehend (NFR-01)
  - [x] Ladezeit < 2s
- **Teststrategie**: Vitest — Rendering; Manuell: Mobile-Check, Wording-Review

### Step 15: Frontend — Leap-Kalender (Sprünge-Tab)

- **Ziel**: Übersicht aller 10 Sprünge mit Status und Details
- **Betroffene Dateien/Module**:
  - `frontend/src/plugins/milestones/LeapCalendar.tsx`
  - `frontend/src/plugins/milestones/LeapCard.tsx`
- **Vorgehen**:
  1. LeapCalendar: 10 Cards vertikal, chronologisch
  2. LeapCard: Nummer, Titel, Zeitraum (berechnet), Status-Badge (vergangen/aktiv/kommend)
     - Aktive Phase: Hervorgehoben (border-peach), expandiert
     - Vergangene Phasen: Dezent (opacity), kompakt
     - Kommende Phasen: Normal, mit erwartetem Datum
  3. Detail-Expansion: Tap → Fähigkeiten + Anzeichen ausklappen
  4. Disclaimer: "Wissenschaftlich umstritten, als Orientierung hilfreich"
  5. Sturm-/Sonnenphasen visuell: Sturm (red/peach), Sonne (green/yellow)
- **Abhängigkeiten**: Step 10, Step 11
- **Akzeptanzkriterien**:
  - [x] Alle 10 Sprünge dargestellt
  - [x] Aktueller Sprung visuell hervorgehoben
  - [x] Berechnete Daten korrekt
  - [x] Disclaimer sichtbar
  - [x] Responsive, mobile-first
- **Teststrategie**: Vitest — Rendering mit Mock-Daten; Manuell: verschiedene Altersgruppen testen

### Step 16: Frontend — Timeline-View

- **Ziel**: Scrollbare Timeline von Geburt bis heute
- **Betroffene Dateien/Module**:
  - `frontend/src/plugins/milestones/MilestoneTimeline.tsx`
  - `frontend/src/plugins/milestones/TimelineEntry.tsx`
- **Vorgehen**:
  1. MilestoneTimeline: Vertikale Timeline mit Monats-Markern
     - Linke Achse: Alter in Monaten
     - Rechts: Milestone-Cards mit Foto-Thumbnail, Titel, Datum
     - Leap-Phasen als farbige Hintergrund-Bereiche
  2. Navigation: Jump-to-Age via Monat-Buttons oder Scroll
  3. Lazy-Loading: Bilder erst bei Sichtbarkeit laden (IntersectionObserver)
  4. Empty-State: "Noch keine Meilensteine erfasst — starte mit den Vorschlägen!"
  5. Performance: Virtualisierung wenn > 50 Einträge (optional, erst bei Bedarf)
- **Abhängigkeiten**: Step 10, Step 12
- **Akzeptanzkriterien**:
  - [x] Timeline scrollbar, korrekte Chronologie
  - [x] Leap-Phasen als farbige Bereiche sichtbar
  - [x] Foto-Thumbnails lazy-loaded
  - [x] Jump-to-Age funktional
  - [x] Performance < 2s bei 50 Einträgen
- **Teststrategie**: Vitest — Rendering; Manuell: Scroll-Performance, Mobile-Touch

### Step 17: Frontend — Dashboard-Widget

- **Ziel**: Kompaktes Widget im Dashboard Widget-Grid
- **Betroffene Dateien/Module**:
  - `frontend/src/plugins/milestones/MilestoneWidget.tsx`
  - `frontend/src/pages/Dashboard.tsx` (Integration)
- **Vorgehen**:
  1. MilestoneWidget: Card mit:
     - Aktuelle Leap-Phase (wenn aktiv) — Titel + Sturm/Sonne
     - Nächster Meilenstein-Vorschlag
     - Zähler: "X von Y erreicht" (für aktuelle Altersgruppe)
  2. Klick → navigiert zu /milestones
  3. Dashboard.tsx: Widget einfügen mit `isPluginEnabled("milestones")` Guard
- **Abhängigkeiten**: Step 10, Step 11
- **Akzeptanzkriterien**:
  - [x] Widget zeigt relevante Info
  - [x] Klick navigiert korrekt
  - [x] Nur sichtbar wenn Plugin aktiv
  - [x] Konsistent mit bestehendem Widget-Grid
- **Teststrategie**: Vitest — Rendering; Manuell: Dashboard-Integration

### Step 18: Frontend — Suche

- **Ziel**: Suchfunktion über Meilensteine (Titel, Notizen)
- **Betroffene Dateien/Module**:
  - `frontend/src/plugins/milestones/MilestoneSearch.tsx`
  - `backend/app/plugins/milestones/router.py` (Search-Parameter erweitern)
- **Vorgehen**:
  1. Backend: `q` Query-Parameter in GET `/api/v1/milestones/` — SQL LIKE auf title + notes
  2. Frontend: Search-Input oben in der Alle-Meilensteine-Liste
  3. Debounced Search (300ms)
  4. Highlight matching text in Results (optional, nice-to-have)
- **Abhängigkeiten**: Step 6, Step 12
- **Akzeptanzkriterien**:
  - [x] Suche nach "Zahn" findet "Erster Zahn"
  - [x] Suche nach Notiz-Inhalt funktioniert
  - [x] Debounced (keine API-Floods)
  - [x] Leerer Suchbegriff zeigt alle
- **Teststrategie**: pytest — Search-Endpoint; Vitest — Search-Input

### Step 19: Frontend — EntryDetailModal Erweiterung

- **Ziel**: Milestone-Typ im bestehenden EntryDetailModal unterstützen
- **Betroffene Dateien/Module**:
  - `frontend/src/components/EntryDetailModal.tsx`
- **Vorgehen**:
  1. Neuer `case "milestone"` im Type-Switch
  2. Detail-Felder: Titel, Kategorie, Datum, Konfidenz, Notizen, Fotos
  3. Foto-Gallery: Inline-Anzeige der verknüpften Fotos
  4. Editierbare Notizen (konsistent mit bestehendem Pattern)
- **Abhängigkeiten**: Step 10
- **Akzeptanzkriterien**:
  - [x] Milestone-Entries klickbar auf Tag-Detail-Seite
  - [x] Fotos inline angezeigt
  - [x] Notizen editierbar
- **Teststrategie**: Manuell: Tag zuweisen → Tag-Seite → Milestone klicken → Modal prüfen

### Step 20: Frontend-Tests + Integration

- **Ziel**: Vitest-Coverage für alle neuen Komponenten
- **Betroffene Dateien/Module**:
  - `frontend/src/plugins/milestones/__tests__/`
  - `frontend/src/hooks/__tests__/`
- **Vorgehen**:
  1. Component-Tests: MilestoneForm, MilestonesList, LeapCalendar, MilestoneTimeline, MilestoneWidget
  2. Hook-Tests: useMilestones, useLeaps (mit MSW oder Mock)
  3. Integration: Plugin-Toggle, Route-Navigation
- **Abhängigkeiten**: Steps 11-19
- **Akzeptanzkriterien**:
  - [x] Alle Komponenten rendern ohne Crash
  - [x] Form-Validation getestet
  - [x] Quick-Complete Flow getestet
- **Teststrategie**: Vitest + Testing Library

## 7. Teststrategie (übergreifend)

### Backend (pytest + httpx)
- **Unit**: Model-Validierung, Leap-Berechnung, Seed-Data-Integrität
- **Integration**: Alle CRUD-Endpoints via AsyncClient, Photo-Upload mit Testdatei
- **Edge Cases**: Kind ohne Meilensteine, 2-jähriges Kind (alle Leaps vergangen), Neugeborenes (kein Leap aktiv), Kind ohne ET

### Frontend (Vitest + Testing Library)
- **Component**: Rendering, User-Interaction, Form-Validation
- **Hook**: API-Integration mit Mock-Server
- **E2E-artig**: Tab-Navigation, Quick-Complete Flow, Photo-Upload-Preview

### Manuelle Tests
- **Mobile (iPhone 14 Pro)**: Touch-Targets, iOS-Zoom, Scroll-Performance
- **Wording-Review**: Alle Texte auf emotionale Sicherheit prüfen (NFR-01)
- **Photo-Upload**: Verschiedene Bildformate, Größenlimits
- **Leap-Berechnung**: Mit echtem Kind-Alter verifizieren

## 8. Risiken & Mitigation

| # | Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|--------|--------------------:|--------|------------|
| R1 | Photo-Upload bläht Container-Volume auf | Mittel | Mittel | Max 10 MB pro Foto, max 3 Fotos pro Milestone (MVP), Monitoring |
| R2 | Seed-Daten-Migration schlägt bei bestehendem Container fehl | Niedrig | Hoch | Idempotente Migration (INSERT OR IGNORE), Downgrade-Path |
| R3 | Timeline-Performance bei vielen Einträgen (>100) | Niedrig | Mittel | Pagination, Lazy-Load, Virtualisierung als Fallback |
| R4 | Eltern fühlen sich durch Meilenstein-Vorschläge unter Druck | Mittel | Hoch | Soft-Wording durchgehend, Disclaimer, keine "verspätet"-Labels |
| R5 | Leap-Berechnung ungenau ohne ET | Niedrig | Niedrig | Fallback auf birth_date dokumentiert, Hinweis in UI |
| R6 | Static-File-Mount Sicherheit (Path Traversal) | Niedrig | Hoch | FastAPI StaticFiles ist sicher, UUID-Dateinamen verhindern Vorhersagbarkeit |
| R7 | MIME-Type Spoofing bei Photo-Upload | Niedrig | Mittel | python-magic für echte MIME-Type-Erkennung, nicht nur Extension |

## 9. Rollout & Migration

### Deployment-Ablauf
1. Container-Build mit neuem Plugin-Code
2. `alembic upgrade head` läuft automatisch bei Start (Lifespan)
3. Schema-Migrationen (Step 2) + Data-Migrationen (Step 3) werden sequenziell ausgeführt
4. Static-Mount für `/uploads/` wird beim App-Start registriert
5. `data/uploads/milestones/` Verzeichnis wird bei erstem Upload automatisch erstellt

### Feature-Flag
- Plugin ist per Default **deaktiviert** (isBase: false in pluginRegistry)
- User aktiviert es explizit in Verwaltung → erscheint in Navigation + Dashboard
- Kein Code-Feature-Flag nötig — Plugin-Config-System reicht aus

### Backwards Compatibility
- Keine Breaking Changes an bestehenden Tabellen (nur Child-Erweiterung, nullable)
- Keine Änderung an bestehenden API-Endpoints
- Bestehende Plugins unberührt

### Volume-Mount
- Upload-Verzeichnis unter `data/uploads/` — bereits im Docker-Volume gemountet (`/volume2/docker/mybaby/data`)
- Kein zusätzliches Volume nötig

## 10. Definition of Done

- [ ] Alle 5 DB-Tabellen migriert + Seed-Daten eingespielt
- [ ] Child-Model hat `estimated_birth_date` (nullable)
- [ ] Backend: Alle CRUD-Endpoints funktional (Milestones, Categories, Templates, Leaps, Photos)
- [ ] Backend: Photo-Upload + Static-Serving funktional
- [ ] Backend: Leap-Status-Berechnung korrekt
- [ ] Backend: > 80% Test-Coverage auf Plugin-Code
- [ ] Frontend: Plugin in Registry, Route, Navigation
- [ ] Frontend: 4-Tab-View (Übersicht, Timeline, Alle, Sprünge)
- [ ] Frontend: Milestone-CRUD mit Form, Liste, Quick-Complete
- [ ] Frontend: Photo-Upload + Anzeige
- [ ] Frontend: Leap-Kalender mit Status
- [ ] Frontend: Dashboard-Widget
- [ ] Frontend: Suche funktional
- [ ] Frontend: EntryDetailModal erweitert
- [ ] Frontend: Vitest-Coverage für Kernkomponenten
- [ ] Manuell: Mobile-Test auf iPhone (Touch, Zoom, Performance)
- [ ] Manuell: Wording-Review (emotionale Sicherheit)
- [ ] Container: Build + Deploy auf NAS funktional
- [ ] Alle Tests grün (Backend + Frontend)

## 11. Referenzen

| Ressource | Pfad/Link |
|-----------|-----------|
| Requirement-Dokument | `500 CONTEXTS/.../Requirements Dokument - Child Milestones & Development Leaps Plugin for Baby-Tracker App.md` |
| Emotionale Events | `500 CONTEXTS/.../BabyTracker-Events.md` |
| Entwicklungssprünge | `500 CONTEXTS/.../BabyTracker-Sprünge.md` |
| Architecture Spec | `docs/superpowers/specs/2026-04-19-mybaby-architecture-design.md` |
| Design System | `DESIGN.md` |
| Plugin-Base | `backend/app/plugins/_base.py` |
| Plugin-Registry (Backend) | `backend/app/plugins/registry.py` |
| Plugin-Registry (Frontend) | `frontend/src/lib/pluginRegistry.ts` |
| Medication Plugin (Referenz) | `backend/app/plugins/medication/` |
| Child Model | `backend/app/models/child.py` |
| Tag System | `backend/app/models/tag.py` |
| BottomNav | `frontend/src/components/BottomNav.tsx` |
| EntryDetailModal | `frontend/src/components/EntryDetailModal.tsx` |
