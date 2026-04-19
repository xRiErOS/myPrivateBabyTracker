# MyBaby — Architecture Design Spec

> Self-hosted, plugin-based baby tracker. Replaces Baby Buddy with a modular, AI-first system.

## 1. Overview

### Problem

Baby Buddy works but overwhelms users with features irrelevant to their tracking preferences. Every family has different priorities (sleep patterns vs. feeding details vs. milestones). A static feature set leads to UI clutter and reduced adoption.

### Solution

A self-hosted baby tracker where families choose which tracking modules are active via frontend settings. Inactive modules are invisible (no navigation, no widgets, no routes). Single-container deployment.

### Non-Goals

- Multi-tenancy for unrelated families (one family per instance)
- Native mobile apps (PWA suffices)
- Cloud sync or federation
- Medical diagnostics or predictive ML
- Real-time collaboration (no WebSocket notifications in MVP)

### Scope

Standalone product — own repo ([xRiErOS/myPrivateBabyTracker](https://github.com/xRiErOS/myPrivateBabyTracker)), own domain (`baby.familie-riedel.org`), own container. Fully decoupled from Home Dashboard.

## 2. Architecture

### Container Architecture

```
Single Docker Container (python:3.12-slim)
│
├── uvicorn (ASGI Server, Port 8080)
│   ├── /api/v1/*        → FastAPI REST-Endpoints (Plugin-Router)
│   ├── /api/auth/*      → Auth-Endpoints (Login, Session, Forward-Auth)
│   ├── /api/plugins/*   → Plugin-Registry & Settings
│   ├── /health          → Healthcheck for Portainer
│   └── /*               → Static Files (React Build, SPA Fallback)
│
├── /data/               → Volume-Mount
│   ├── mybaby.db        → SQLite WAL
│   └── backups/         → Auto-Backup before migrations
│
└── plugins/             → Plugin-Module (Python + React)
    ├── sleep/
    ├── feeding/
    ├── diaper/
    └── ...
```

### Network Topology (Target Setup)

```
Smartphone (PWA)
  → Cloudflare Tunnel
    → NPM (Authelia two_factor, Forward-Auth)
      → MyBaby Container (Port 8080)
        → uvicorn serves API + SPA
```

### Tech Stack

| Component | Choice | Version |
|-----------|--------|---------|
| Backend Framework | FastAPI | 0.115+ |
| ASGI Server | uvicorn | 0.30+ |
| ORM | SQLAlchemy 2.0 | 2.0+ |
| Migrations | Alembic | 1.13+ |
| Validation | Pydantic | 2.0+ |
| Database | SQLite (WAL mode) | 3.40+ |
| Auth (passwords) | Argon2 (argon2-cffi) | 23+ |
| CLI | Typer | 0.12+ |
| Logging | structlog | 24+ |
| CSRF Protection | starlette-csrf | 3+ |
| Rate Limiting | slowapi | 0.1+ |
| Frontend | React + TypeScript | 18.x |
| Styling | Tailwind CSS | 3.x |
| Build Tool | Vite | 6.x |
| Icons | lucide-react | 0.469+ |
| i18n | react-i18next | 14+ |
| Container Base | python:3.12-slim | — |
| Frontend Build | node:22-alpine (build stage only) | — |

### Monorepo Structure

```
mybaby/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, plugin loader, static file mount
│   │   ├── cli.py               # Typer CLI entry point
│   │   ├── core/
│   │   │   ├── auth.py          # Local Auth + Forward-Auth middleware
│   │   │   ├── config.py        # Pydantic Settings (env-based, startup validation)
│   │   │   ├── database.py      # SQLAlchemy engine, session factory
│   │   │   ├── models.py        # User, Child, PluginState, AuditLog
│   │   │   ├── events.py        # In-memory event bus (asyncio)
│   │   │   ├── security.py      # CSRF, CSP, header stripping, rate limiting
│   │   │   ├── logging.py       # structlog JSON configuration
│   │   │   ├── plugin_registry.py  # Discovery, activation, settings validation
│   │   │   ├── export.py        # JSON full export/import (AES-256 optional)
│   │   │   └── dependencies.py  # FastAPI Depends: get_db, get_current_user
│   │   └── plugins/
│   │       ├── __init__.py      # Auto-discovery via __subclasses__
│   │       ├── _base.py         # Abstract PluginBase class
│   │       ├── sleep/
│   │       │   ├── __init__.py  # SleepPlugin(PluginBase) with metadata
│   │       │   ├── models.py    # SleepEntry SQLAlchemy model
│   │       │   ├── router.py    # FastAPI router (/api/v1/sleep/*)
│   │       │   ├── schemas.py   # Pydantic request/response schemas
│   │       │   └── widget.py    # Dashboard widget definition
│   │       ├── feeding/
│   │       │   ├── __init__.py
│   │       │   ├── models.py
│   │       │   ├── router.py
│   │       │   ├── schemas.py
│   │       │   └── widget.py
│   │       └── diaper/
│   │           ├── __init__.py
│   │           ├── models.py
│   │           ├── router.py
│   │           ├── schemas.py
│   │           └── widget.py
│   ├── alembic/                 # DB migrations
│   │   ├── alembic.ini
│   │   └── versions/
│   ├── tests/
│   │   ├── conftest.py          # Fixtures: test DB, test client, test user
│   │   ├── test_auth.py
│   │   ├── test_plugins.py
│   │   └── plugins/
│   │       ├── test_sleep.py
│   │       ├── test_feeding.py
│   │       └── test_diaper.py
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Router shell
│   │   ├── main.tsx             # Entry point
│   │   ├── core/
│   │   │   ├── AuthProvider.tsx # Auth context, session check
│   │   │   ├── Shell.tsx        # Navigation shell, dynamic menu
│   │   │   ├── Dashboard.tsx    # Widget grid, renders active plugin widgets
│   │   │   ├── Settings.tsx     # Plugin activation, per-plugin config forms
│   │   │   ├── ChildSelector.tsx # Multi-child switcher
│   │   │   ├── api.ts           # Fetch wrapper with auth headers + CSRF token
│   │   │   └── i18n.ts          # react-i18next setup, de as default
│   │   ├── plugins/
│   │   │   ├── registry.ts     # Plugin component map (typed, lazy imports)
│   │   │   ├── types.ts        # PluginDefinition interface
│   │   │   ├── sleep/
│   │   │   │   ├── SleepForm.tsx
│   │   │   │   ├── SleepWidget.tsx
│   │   │   │   └── SleepList.tsx
│   │   │   ├── feeding/
│   │   │   │   ├── FeedingForm.tsx
│   │   │   │   ├── FeedingWidget.tsx
│   │   │   │   └── FeedingList.tsx
│   │   │   └── diaper/
│   │   │       ├── DiaperForm.tsx
│   │   │       ├── DiaperWidget.tsx
│   │   │       └── DiaperList.tsx
│   │   └── styles/
│   │       └── index.css        # Catppuccin Latte/Macchiato CSS variables
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── Dockerfile                   # Multi-stage: node build → python runtime
├── docker-compose.yml
├── .env.example
└── docs/
    ├── plugin-sdk.md            # How to create a plugin
    └── deployment.md            # Setup guide
```

## 3. Architecture Decision Records (ADRs)

### ADR-1: Plugin Registry — Filesystem Scan with Base Class

**Decision:** Each plugin is a Python package in `backend/app/plugins/`. On startup, the plugin loader scans all subdirectories, imports the module, and checks for a class inheriting from `PluginBase`.

```python
class PluginBase:
    name: str              # "sleep"
    display_name: str      # "Schlaf"
    version: str           # "1.0.0"
    api_level: int = 1     # Compatibility level
    settings_schema: dict  # JSON Schema for plugin settings

    def register_routes(self, app: FastAPI) -> None: ...
    def register_models(self) -> list[Base]: ...
    def register_widgets(self) -> list[WidgetDef]: ...
    def on_event(self, event: str, payload: dict) -> None: ...
```

**Rationale:** Entry-points are for installable packages — everything is in the monorepo here. Config-file would be redundant — the code IS the registry. Filesystem scan is the pattern used by Home Assistant and Datasette.

**Activation without restart:** Activation/deactivation is a DB flag. The router is always registered, middleware checks whether the plugin is active. No restart needed.

### ADR-2: Frontend Plugin Integration — Build-Time (Single Bundle)

**Decision:** All plugin UI components are bundled at build time via Vite. Lazy-loaded via `React.lazy()`.

```javascript
const plugins = {
  sleep:   { Form: lazy(() => import('./sleep/SleepForm')),
             Widget: lazy(() => import('./sleep/SleepWidget')),
             icon: Moon, label: 'Schlaf' },
  feeding: { ... },
  diaper:  { ... },
}
```

**Rationale:** Module Federation adds Webpack complexity for a 2-10 user project. iFrames break shared state and theme. A single bundle with lazy loading is performant enough and keeps the SPA consistent.

**Adding a new plugin:** Create folder in `frontend/src/plugins/`, add one line to `registry.js`. No core code change.

### ADR-3: Data Model — Plugin-Owned Tables with Naming Convention

**Decision:** Each plugin manages its own tables with a naming prefix.

```
Core:     users, children, child_caregivers, plugin_states, plugin_settings, audit_log
Sleep:    sleep_entries (id, child_id, user_id, start, end, type, notes, created_at)
Feeding:  feeding_entries (id, child_id, user_id, timestamp, type, method, amount_ml, duration_min, notes, created_at)
Diaper:   diaper_entries (id, child_id, user_id, timestamp, wet, solid, color, notes, created_at)
```

Every table has `child_id` (FK → children) and `user_id` (FK → users) as mandatory fields.

**Rationale:** Plugin-owned tables allow typed queries (`SELECT AVG(amount_ml) FROM feeding_entries`), DB-level validation, and proper indexing. A generic event schema would require JSON parsing in every query and lose type safety. Schema evolution via Alembic per plugin — independently.

### ADR-4: API Style — REST with Auto-Generated OpenAPI

**Decision:** RESTful API with versioned paths. FastAPI generates OpenAPI 3.1 schema automatically.

```
GET    /api/v1/sleep/?child_id=1&date=2026-04-19    → Filtered list
POST   /api/v1/sleep/                                → Create entry
PATCH  /api/v1/sleep/{id}                            → Update entry
DELETE /api/v1/sleep/{id}                            → Delete entry
GET    /api/v1/plugins/                              → Available plugins + status
PUT    /api/v1/plugins/{name}/activate               → Activate plugin
GET    /api/v1/dashboard/widgets?child_id=1          → Active widgets + summary
GET    /api/v1/export/                               → Full JSON export
```

**AI-First aspect:** The OpenAPI schema can be exported directly as MCP tool schema or LLM function-calling definitions. Any AI agent only needs to read the schema to interact with the API.

**Rationale:** GraphQL solves over-fetching — not a problem for 2-10 users. tRPC requires TypeScript backend. REST + OpenAPI is the most universally understood API contract.

### ADR-5: Event Bus — In-Memory Pub-Sub (asyncio)

**Decision:** Simple in-process event emitter using Python asyncio.

```python
class EventBus:
    async def emit(self, event: str, payload: dict) -> None: ...
    def on(self, event: str, handler: Callable) -> None: ...

# Example:
bus.emit("feeding.created", {"child_id": 1, "amount_ml": 120})
```

**Rationale:** 2-10 users, no worker pool, no retry logic needed. If an event is lost on container restart, that's acceptable — events are convenience, not data path. Interface is stable enough to upgrade to Redis/DB-queue later.

### ADR-6: PWA Offline Mode — MVP Without, Later Last-Write-Wins

**Decision:** MVP: Service worker for app-shell caching only (fast start, icons, fonts). No offline data capture.

Phase 2 (post-MVP): IndexedDB buffer for entries, sync on reconnect with Last-Write-Wins. Conflicts resolved by timestamp + user warning.

**Rationale:** CRDTs are for collaborative real-time editing (Google Docs). Here, 2 people write sequential events. The probability of both simultaneously editing the same entry offline is effectively zero.

### ADR-7: Plugin Versioning — Monorepo Version + API Level Integer

**Decision:** The entire repo has one semver version. Plugins declare which `api_level` they require.

```python
class SleepPlugin(PluginBase):
    name = "sleep"
    version = "1.0.0"    # Follows monorepo version
    api_level = 1         # Core guarantees backward compatibility within a level
```

**Rationale:** Single repo, single release, single container — independent versioning per plugin would be over-engineering. Breaking changes to the plugin interface increment `api_level`, old plugins are deactivated with a warning.

## 4. Authentication & Security

### Dual-Mode Auth

**Mode 1 — Forward-Auth (Authelia/Traefik/etc.):**

```
NPM → Authelia → sets headers:
  Remote-User: erik
  Remote-Groups: admin
  Remote-Name: Erik Riedel

FastAPI middleware reads headers → creates/matches user → sets session
```

**Mode 2 — Local Auth (standalone, no reverse proxy):**

```
Login form → POST /api/auth/login (email + password)
  → Argon2 verify → session cookie (httponly, secure, samesite=lax)
```

**Configuration via environment:**

```
AUTH_MODE=forward         # "local" or "both"
AUTH_TRUSTED_HEADER=Remote-User
AUTH_TRUSTED_PROXIES=192.168.178.0/24  # Exact subnet of NPM, not /16
SECRET_KEY=<min 32 chars>              # App refuses to start without this
LOG_LEVEL=INFO                         # DEBUG, INFO, WARNING, ERROR
```

With `both`: Forward-Auth takes priority, local auth as fallback (e.g., API access from external tools).

**Roles:** `admin` (everything), `caregiver` (CRUD on entries), `viewer` (read only). Stored in `users` table, mapped from `Remote-Groups` in forward-auth mode.

### Security Hardening (K1-K4)

**K1 — Forward-Auth Header-Spoofing Prevention:**

The first middleware in the chain MUST strip all `Remote-*` headers from incoming requests before processing. This prevents clients from injecting fake auth headers when accessing uvicorn directly (misconfiguration) or via a non-Authelia path.

```python
# core/security.py — HeaderStrippingMiddleware
# 1. Strip Remote-User, Remote-Groups, Remote-Name from ALL requests
# 2. Only re-allow if request comes from AUTH_TRUSTED_PROXIES
# 3. uvicorn --forwarded-allow-ips must match AUTH_TRUSTED_PROXIES
```

uvicorn MUST NOT be directly reachable from the internet. The Dockerfile does not expose port 8080 to host — only docker-compose maps it.

**K2 — CSRF Protection & Content Security Policy:**

CSRF: Double-Submit-Cookie pattern via `starlette-csrf`. The CSRF token is set as a cookie and must be sent back in the `X-CSRF-Token` header on state-changing requests (POST/PATCH/DELETE). Forward-Auth mode still requires CSRF because Authelia authenticates the user but does not protect against cross-site request forgery within the authenticated session.

CSP headers set on all responses:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

`unsafe-inline` for style-src is required by Tailwind's runtime styles. No `unsafe-eval`.

**K3 — Input Validation Strategy:**

All plugin schemas MUST use Pydantic constraints as SDK standard:
```python
# Plugin SDK validation rules (enforced by PluginBase)
class EntryBase(BaseModel):
    notes: str | None = Field(None, max_length=2000)
    timestamp: datetime  # Always UTC, validated by Pydantic

class FeedingCreate(EntryBase):
    amount_ml: int | None = Field(None, ge=0, le=2000)
    type: Literal["bottle", "breast", "solid"]
    method: Literal["left", "right", "both"] | None = None
    duration_min: int | None = Field(None, ge=0, le=480)
```

Output encoding: All text fields are escaped before JSON serialization (Pydantic handles this). The frontend uses React's default JSX escaping — no `dangerouslySetInnerHTML` anywhere.

**K4 — Secrets Management:**

Startup validation in `core/config.py`:
```python
class Settings(BaseSettings):
    secret_key: str = Field(..., min_length=32)
    auth_mode: Literal["forward", "local", "both"] = "forward"
    # App crashes on startup if SECRET_KEY is missing or too short
```

Key generation documented in `.env.example`:
```bash
# Generate: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=
```

If `SECRET_KEY` changes, all sessions are invalidated (expected behavior, documented).

### Rate Limiting (E1)

Login endpoint (`POST /api/auth/login`) is rate-limited via `slowapi`:
- 5 attempts per minute per IP
- 20 attempts per hour per IP
- Returns `429 Too Many Requests` with `Retry-After` header

Other API endpoints: 60 requests/minute per authenticated user (generous for 2-10 users, prevents accidental infinite loops in client code).

## 5. Core Data Model

### Timezone Convention (W1)

**All timestamps in the database are UTC.** No exceptions.

- SQLAlchemy models use `DateTime(timezone=True)` with `func.now()` as server default (not raw `datetime('now')`)
- The API accepts ISO 8601 with timezone offset (e.g., `2026-04-19T14:30:00+02:00`) and converts to UTC before storage
- The API returns UTC timestamps with `Z` suffix
- The frontend converts UTC → local timezone for display using `Intl.DateTimeFormat`
- Sleep intervals spanning midnight or DST transitions are stored as UTC start/end — the frontend handles display

This convention ensures PostgreSQL compatibility (W2) and prevents ambiguity during DST changes.

### PostgreSQL Compatibility (W2)

All SQLAlchemy models use portable constructs only:
- `func.now()` instead of `datetime('now')` for defaults
- `sa.Integer` with `autoincrement=True` (maps to SERIAL/IDENTITY on PostgreSQL)
- No raw SQL with SQLite-specific syntax in models
- WAL mode configuration is isolated in `database.py` behind an `if sqlite` check
- Alembic migrations use SQLAlchemy types only — no raw DDL

No PostgreSQL test target in CI for MVP. If PostgreSQL becomes needed, the migration path is: change `DATABASE_URL`, run `alembic upgrade head`, verify.

### Plugin Migration Strategy (W3)

Alembic runs ALL plugin migrations on startup, regardless of plugin activation state. Tables for deactivated plugins exist but are not queried by the API (middleware returns 404 for inactive plugin routes).

- Plugin activation/deactivation only flips the `is_active` flag — no DDL changes
- Plugin deletion (explicit user action, post-MVP): offers JSON export of plugin data, then `DROP TABLE` after confirmation
- New plugin added to codebase: Alembic auto-generates migration on next `mybaby db migrate`

```python
# core/models.py — all models use SQLAlchemy 2.0 mapped_column
class TimestampMixin:
    """Reusable mixin for created_at/updated_at."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

### Core Tables

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT,          -- NULL when forward-auth only
    role TEXT NOT NULL DEFAULT 'caregiver',  -- admin, caregiver, viewer
    display_name TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP  -- UTC
);

CREATE TABLE children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birth_date TEXT NOT NULL,    -- ISO 8601 date (no time)
    gender TEXT,                 -- optional
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE child_caregivers (
    child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (child_id, user_id)
);

CREATE TABLE plugin_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_name TEXT NOT NULL,
    child_id INTEGER REFERENCES children(id),  -- NULL = globally active
    is_active INTEGER NOT NULL DEFAULT 0,
    activated_at TIMESTAMP,
    UNIQUE(plugin_name, child_id)
);

CREATE TABLE plugin_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_name TEXT NOT NULL,
    child_id INTEGER REFERENCES children(id),  -- NULL = global settings
    settings_json TEXT NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plugin_name, child_id)
);

CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,        -- create, update, delete
    entity_type TEXT NOT NULL,   -- sleep_entries, feeding_entries, ...
    entity_id INTEGER,
    diff_json TEXT,              -- {field: [old, new]}
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### MVP Plugin Tables

```sql
-- Sleep plugin
CREATE TABLE sleep_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL REFERENCES children(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    start TIMESTAMP NOT NULL,    -- UTC
    "end" TIMESTAMP,             -- NULL = ongoing; quoted because reserved word
    type TEXT DEFAULT 'nap',     -- nap, night
    notes TEXT CHECK(length(notes) <= 2000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Feeding plugin
CREATE TABLE feeding_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL REFERENCES children(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    timestamp TIMESTAMP NOT NULL,  -- UTC
    type TEXT NOT NULL CHECK(type IN ('bottle', 'breast', 'solid')),
    method TEXT CHECK(method IN ('left', 'right', 'both')),
    amount_ml INTEGER CHECK(amount_ml >= 0 AND amount_ml <= 2000),
    duration_min INTEGER CHECK(duration_min >= 0 AND duration_min <= 480),
    notes TEXT CHECK(length(notes) <= 2000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Diaper plugin
CREATE TABLE diaper_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL REFERENCES children(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    timestamp TIMESTAMP NOT NULL,  -- UTC
    wet INTEGER NOT NULL DEFAULT 0 CHECK(wet IN (0, 1)),
    solid INTEGER NOT NULL DEFAULT 0 CHECK(solid IN (0, 1)),
    color TEXT CHECK(color IN ('yellow', 'green', 'brown', 'black')),
    notes TEXT CHECK(length(notes) <= 2000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes (W4)

```sql
-- Plugin query performance (all queries filter by child_id + time range)
CREATE INDEX idx_sleep_child_start ON sleep_entries(child_id, start);
CREATE INDEX idx_feeding_child_ts ON feeding_entries(child_id, timestamp);
CREATE INDEX idx_diaper_child_ts ON diaper_entries(child_id, timestamp);

-- Audit log queries
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user_time ON audit_log(user_id, created_at);

-- Plugin state lookups
CREATE INDEX idx_plugin_states_name ON plugin_states(plugin_name);
```

## 6. Plugin SDK Interface

### Backend Plugin Contract

```python
from abc import ABC, abstractmethod
from fastapi import FastAPI
from sqlalchemy.orm import DeclarativeBase

class WidgetDef:
    """Dashboard widget definition."""
    name: str           # "sleep_summary"
    display_name: str   # "Schlaf heute"
    size: str           # "small", "medium", "large"
    endpoint: str       # "/api/v1/sleep/widget"

class PluginBase(ABC):
    """Base class for all plugins."""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def display_name(self) -> str: ...

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def api_level(self) -> int:
        return 1

    @property
    def settings_schema(self) -> dict:
        """JSON Schema for plugin-specific settings."""
        return {}

    @abstractmethod
    def register_routes(self, app: FastAPI) -> None:
        """Register FastAPI routes under /api/v1/{plugin_name}/"""
        ...

    @abstractmethod
    def register_models(self) -> list[type[DeclarativeBase]]:
        """Return SQLAlchemy models for migration discovery."""
        ...

    def register_widgets(self) -> list[WidgetDef]:
        """Return dashboard widget definitions."""
        return []

    def on_event(self, event: str, payload: dict) -> None:
        """Handle events from other plugins or core."""
        pass
```

### Frontend Plugin Contract

```typescript
// frontend/src/plugins/types.ts
import { LazyExoticComponent, ComponentType } from 'react'
import { LucideIcon } from 'lucide-react'

export interface PluginDefinition {
  name: string
  displayName: string
  icon: LucideIcon
  Form: LazyExoticComponent<ComponentType<PluginFormProps>>
  Widget: LazyExoticComponent<ComponentType<PluginWidgetProps>>
  List: LazyExoticComponent<ComponentType<PluginListProps>>
  Timeline?: LazyExoticComponent<ComponentType<PluginTimelineProps>>
  settingsForm?: LazyExoticComponent<ComponentType<PluginSettingsProps>>
}

export interface PluginFormProps {
  childId: number
  onSubmit: (data: unknown) => Promise<void>
}

export interface PluginWidgetProps {
  childId: number
  dateRange: { from: string; to: string }
}

// Each plugin exports:
const sleepPlugin: PluginDefinition = {
  name: 'sleep',
  displayName: 'Schlaf',
  icon: Moon,
  Form: lazy(() => import('./SleepForm')),
  Widget: lazy(() => import('./SleepWidget')),
  List: lazy(() => import('./SleepList')),
  Timeline: lazy(() => import('./SleepTimeline')),
}
```

### Plugin Activation Sequence

```
1. User toggles plugin "sleep" ON in Settings UI
2. PUT /api/v1/plugins/sleep/activate {child_id: 1}
3. Core writes plugin_states row (is_active=1)
4. Response: {status: "active", routes: ["/api/v1/sleep/*"]}
5. Frontend re-fetches /api/v1/plugins/ → updates navigation + dashboard
6. Sleep routes now return data (were returning 404 "plugin inactive" before)
```

## 7. CLI

```bash
# Entry point: mybaby (via pyproject.toml [project.scripts])
mybaby feeding add --child anna --amount 120 --type bottle
mybaby feeding list --child anna --date today
mybaby sleep start --child anna
mybaby sleep stop --child anna
mybaby plugins list
mybaby plugins activate sleep --child anna
mybaby export --format json > backup.json
mybaby export --format json --encrypt --passphrase "..." > backup.json.enc  # W7: AES-256
mybaby import --source babybuddy --file export.csv
mybaby db migrate              # Run pending Alembic migrations
mybaby openapi export           # E2: Dump OpenAPI schema to stdout (for MCP/agent tooling)
mybaby mcp serve               # Start MCP server (stdio or SSE)
```

Implementation via Typer (FastAPI's CLI counterpart, same Pydantic ecosystem). Uses the same service-layer functions as the API — no duplicated code.

### Backup Encryption (W7)

Export supports optional AES-256-GCM encryption via `--encrypt` flag. Uses `cryptography` library (Fernet). Passphrase is stretched via PBKDF2. Encrypted exports have `.enc` suffix and include a magic header for format detection on import.

Unencrypted export remains the default — encryption is opt-in per the requirements brief.

## 8. Deployment

### Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Frontend build
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Python runtime
FROM python:3.12-slim
WORKDIR /app

COPY backend/pyproject.toml ./
RUN pip install --no-cache-dir -e .

COPY backend/ ./
COPY --from=frontend /app/frontend/dist ./static/

EXPOSE 8080
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request,json; r=urllib.request.urlopen('http://localhost:8080/health'); d=json.load(r); assert d['db']"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", \
     "--timeout-graceful-shutdown", "10", \
     "--forwarded-allow-ips", "192.168.178.0/24"]
```

### Graceful Shutdown (W5)

- `STOPSIGNAL SIGTERM` in Dockerfile ensures uvicorn receives proper signal
- `--timeout-graceful-shutdown 10` gives in-flight requests 10s to complete
- FastAPI `shutdown` event handler disposes SQLAlchemy engine and flushes logs
- SQLite WAL checkpoint runs on clean shutdown (`PRAGMA wal_checkpoint(TRUNCATE)`)

### Structured Logging (W6)

All logging via `structlog` in JSON format:

```python
# core/logging.py
import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
)
```

Each log entry includes:
- `request_id` (UUID, set by middleware, correlates all logs for one request)
- `user_id` (if authenticated)
- `level` (configurable via `LOG_LEVEL` env var)

uvicorn access logs also JSON-formatted via custom log config.

### Healthcheck (E4)

`GET /health` returns detailed status:

```json
{
  "status": "ok",
  "db": true,
  "disk_free_mb": 4200,
  "plugins_loaded": 3,
  "version": "0.1.0"
}
```

Checks: SQLite `SELECT 1`, disk space on `/data` volume (warns at <100MB), loaded plugin count. Returns HTTP 503 if any check fails.

### docker-compose.yml

```yaml
services:
  mybaby:
    build: .
    container_name: mybaby
    ports:
      - "8080:8080"
    environment:
      - AUTH_MODE=forward
      - AUTH_TRUSTED_HEADER=Remote-User
      - AUTH_TRUSTED_PROXIES=192.168.178.0/24
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=sqlite:///data/mybaby.db
      - LOG_LEVEL=INFO
    volumes:
      - ./data:/data
    restart: unless-stopped
    stop_grace_period: 15s
    networks:
      - nginx-proxy_default

networks:
  nginx-proxy_default:
    external: true
```

### NPM Configuration

```
Domain:       baby.familie-riedel.org
Scheme:       https
Forward Host: 192.168.178.185
Forward Port: 8080
Forward-Auth: Authelia (two_factor)
```

## 9. Testing Strategy (W8)

### Coverage Targets

| Layer | Target | Tool |
|-------|--------|------|
| Core (auth, plugin_registry, events, security) | > 80% line coverage | pytest + coverage |
| Plugin backends (router, schemas) | Integration tests per plugin | pytest + httpx TestClient |
| Frontend core (Shell, Dashboard, Settings) | Component tests | Vitest + Testing Library |
| Frontend plugins | Smoke tests (renders, submits) | Vitest + Testing Library |
| E2E | Critical paths only (login, create entry, view dashboard) | Playwright (post-MVP) |

### Test Infrastructure

```bash
# Backend
cd backend && pytest --cov=app --cov-report=term-missing
# Frontend
cd frontend && npm run test
# CI (GitHub Actions, post-MVP)
# - Lint (ruff + eslint)
# - Backend tests with SQLite in-memory
# - Frontend tests with jsdom
# - Coverage gate: fail if core < 80%
```

Fixtures: In-memory SQLite database, pre-seeded test user + child, authenticated TestClient. Each test gets a fresh DB transaction that rolls back after the test.

## 10. Internationalization (E5)

Default language: German (`de`). i18n-prepared from day one using `react-i18next`:

- All user-facing strings in translation files (`frontend/src/locales/de.json`, `en.json`)
- Backend error messages use error codes (e.g., `FEEDING_OVERLAP`), frontend maps to translated strings
- Date/time formatting via `Intl.DateTimeFormat` (already used for timezone display)
- No i18n for plugin names in MVP — `displayName` is hardcoded per plugin. Plugin-level i18n is a post-v1.0 feature.

Language selection stored per user in `users.locale` column (default: `de`).

## 11. Webhook Support (E7)

Post-MVP (v0.4.0+): Optional outbound webhooks for AI agent integration.

```
POST /api/v1/settings/webhooks
{
  "url": "https://example.com/hook",
  "events": ["feeding.created", "sleep.ended"],
  "secret": "hmac-secret-for-signature"
}
```

Each webhook delivery includes:
- `X-MyBaby-Signature` header (HMAC-SHA256 of payload with shared secret)
- Event type and payload as JSON body
- 3 retries with exponential backoff (1s, 5s, 30s)

This enables: Telegram bots, Home Assistant automations, external dashboards — without coupling them into the codebase.

## 12. Plugin Deletion Flow (E8)

Post-MVP. When a user explicitly deletes a plugin's data (not just deactivation):

1. Settings UI shows warning: "Alle Daten dieses Plugins werden unwiderruflich gelöscht"
2. System offers JSON export of plugin data before deletion
3. User confirms with password/PIN re-entry
4. Plugin data tables are truncated (not dropped — schema stays for potential reactivation)
5. Audit log records the deletion event with user_id and timestamp
6. Plugin state set to `is_active=0`

Full `DROP TABLE` only via CLI (`mybaby plugins purge sleep --confirm`).

## 13. Performance Budget

| Metric | Target | How |
|--------|--------|-----|
| Dashboard load (cold) | < 1s | SQLite indexed queries, lazy-loaded plugin widgets |
| Dashboard load (warm) | < 300ms | Service worker app-shell cache |
| Write latency (new entry) | < 200ms | Direct SQLite insert, WAL mode |
| API response (list, 30 days) | < 500ms | Indexed queries, pagination (limit=100 default) |
| Container memory | < 128MB | python:3.12-slim, no heavy dependencies |
| Docker image size | < 200MB | Multi-stage build, pip --no-cache-dir |

## 14. Risk Register (updated)

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| 1 | SQLite lock on concurrent writes | Low | Medium | WAL mode + retry logic (3x, 100ms backoff) |
| 2 | Plugin migration breaks DB | Low | High | Auto-backup before migration, rollback script |
| 3 | Forward-auth headers spoofed | Low | High | Header-stripping middleware + exact IP whitelist (K1) |
| 4 | CSRF on authenticated sessions | Low | High | Double-Submit-Cookie + CSP headers (K2) |
| 5 | XSS via notes/freetext fields | Low | High | Pydantic constraints + React JSX escaping (K3) |
| 6 | SECRET_KEY leak or weak entropy | Low | High | Startup validation, min 32 chars, documented generation (K4) |
| 7 | Timezone confusion (UTC vs local) | Medium | Medium | UTC-only in DB, frontend converts (W1) |
| 8 | Frontend plugin registry becomes unwieldy | Medium | Low | TypeScript interfaces + example plugin (E3) |
| 9 | Baby Buddy import loses data | Medium | Medium | Dry-run mode with diff report before actual import |

## 15. Release Plan

| Version | Scope |
|---------|-------|
| **v0.1.0** | Core + Sleep/Feeding/Diaper + Forward-Auth + Security (K1-K4) + Dashboard + Baby Buddy Import + Structured Logging + Healthcheck + Tests |
| **v0.2.0** | Temperature, Weight, Supplements (D3/K/Fluorid) + CLI (`mybaby` command) + OpenAPI export |
| **v0.3.0** | Local Auth + Rate Limiting, Audit Log, JSON Export/Import (with optional AES-256 encryption) |
| **v0.4.0** | MCP Server, Event Bus, Webhook Support |
| **v0.5.0** | Dashboard Analysis: time range filters, entity selection, comparison views, trends |
| **v0.6.0** | i18n (English), Plugin deletion flow with export, E2E tests (Playwright) |
| **v1.0.0** | Plugin SDK documentation, example plugin, GitHub public release |

## 16. Migration Path from Baby Buddy

1. Export all data from Baby Buddy via REST API (one-time script)
2. Transform to MyBaby schema (feeding → feeding_entries, changes → diaper_entries, etc.)
3. Import with dry-run validation (diff report: expected vs. imported counts)
4. Parallel operation period (both systems running, new entries only in MyBaby)
5. Decommission Baby Buddy container
6. Update Home Dashboard: remove Baby tab, add link to baby.familie-riedel.org

## 17. Design Tokens (Carried Over)

The existing Catppuccin theme system is preserved:

- **Light Mode:** Catppuccin Latte (full palette)
- **Dark Mode:** Catppuccin Macchiato
- **Color token:** `ground` (not `base` — avoids Tailwind `text-base` collision)
- **Fonts:** Space Grotesk (headlines), Manrope (body), Inter Tight (labels)
- **Border radius:** `rounded-card` = 1rem

CSS variables switch via `prefers-color-scheme` media query, same as current implementation.

## 18. Review Traceability

All findings from the independent architecture review (`2026-04-19-mybaby-architecture-review.md`) have been addressed:

| Finding | Type | Resolution | Section |
|---------|------|-----------|---------|
| K1: Header-Spoofing | Critical | Header-stripping middleware, exact IP whitelist | 4 |
| K2: CSRF/CSP missing | Critical | Double-Submit-Cookie, CSP headers defined | 4 |
| K3: Input validation | Critical | Pydantic constraints as SDK standard, CHECK constraints in SQL | 4, 5 |
| K4: Secrets management | Critical | Startup validation, min 32 chars, generation docs | 4 |
| W1: Timezone handling | Important | UTC-only in DB, documented convention | 5 |
| W2: PostgreSQL compatibility | Important | SQLAlchemy portable constructs, no raw SQLite DDL | 5 |
| W3: Plugin migration lifecycle | Important | Migrations run for all plugins regardless of state | 5 |
| W4: Missing indexes | Important | Indexes defined for all plugin tables + audit log | 5 |
| W5: Graceful shutdown | Important | SIGTERM, timeout, engine dispose, WAL checkpoint | 8 |
| W6: Structured logging | Important | structlog JSON, request_id correlation | 8 |
| W7: Backup encryption | Important | AES-256-GCM via CLI --encrypt flag | 7 |
| W8: Test coverage | Important | Coverage targets, test infrastructure, CI pipeline | 9 |
| E1: Rate limiting | Recommendation | slowapi on login + general API | 4 |
| E2: OpenAPI CLI export | Recommendation | `mybaby openapi export` command | 7 |
| E3: TypeScript frontend | Recommendation | All frontend files .tsx/.ts, typed plugin interface | 2, 6 |
| E4: Extended healthcheck | Recommendation | DB + disk + plugins + version in /health | 8 |
| E5: i18n preparation | Recommendation | react-i18next, de default, en planned | 10 |
| E6: C4 diagrams | Recommendation | Deferred to implementation phase (generated from code) |  |
| E7: Webhook support | Recommendation | Outbound webhooks with HMAC, v0.4.0 | 11 |
| E8: Plugin deletion flow | Recommendation | Export-then-truncate with confirmation, v0.6.0 | 12 |
