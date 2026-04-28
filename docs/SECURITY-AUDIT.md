# Dependency Security Audit

Stand: 2026-04-28 · Sprint 25 (MBT-117) · Repo-Version: v0.8.0+

## Zusammenfassung

| Tool | Scope | Findings | Status |
|------|-------|----------|--------|
| `pip-audit` | `backend/requirements.txt` (50 Pakete inkl. transitive) | **0 Vulnerabilities** | clean |
| `npm audit` | `frontend/package.json` (15 prod + 13 dev dependencies) | **0 Vulnerabilities** | clean |

Keine Critical-, High-, Medium- oder Low-Severity-Findings. Go-Live-Gate bleibt offen.

## Backend (pip-audit)

Befehl: `pipx run pip-audit --requirement backend/requirements.txt --strict --format json`

Geprüfte Top-Level-Dependencies:

- `fastapi` 0.136.1
- `uvicorn[standard]` 0.46.0
- `sqlalchemy` 2.0.49
- `alembic` 1.18.4
- `pydantic` 2.13.3, `pydantic-core` 2.46.3, `pydantic-settings` 2.14.0
- `structlog` 25.5.0
- `argon2-cffi` 25.1.0, `argon2-cffi-bindings` 25.1.0
- `starlette-csrf` 3.0.0
- `slowapi` 0.1.9
- `typer` 0.25.0
- `aiosqlite` 0.22.1
- `greenlet` 3.5.0
- `python-multipart` 0.0.27
- `pyjwt` 2.12.1
- `pyotp` 2.9.0
- `qrcode[pil]` 8.2
- `webauthn` 2.7.1
- `pillow` 12.2.0

Geprüfte transitive Dependencies (Auswahl): `cryptography` 47.0.0, `cbor2` 6.0.0, `pyopenssl` 26.1.0, `starlette` 1.0.0, `anyio` 4.13.0, `pyyaml` 6.0.3, `markupsafe` 3.0.3, `cffi` 2.0.0.

Insgesamt 50 Pakete geprüft, alle ohne bekannte CVEs zum Audit-Datum.

## Frontend (npm audit)

Befehl: `npm audit --json` (im Verzeichnis `frontend/`)

Top-Level-Dependencies (production):

- `react` ^18.3.0, `react-dom` ^18.3.0
- `react-router-dom` ^6.23.0
- `@tanstack/react-query` ^5.99.2
- `i18next` ^26.0.6, `i18next-browser-languagedetector` ^8.2.1, `react-i18next` ^17.0.4
- `lucide-react` ^0.469.0
- `date-fns` ^4.1.0
- `codemirror` ^6.0.2 + `@codemirror/*` (5 Pakete)

DevDependencies (Vite, TypeScript, Vitest, Tailwind, Testing Library, ESLint).

Insgesamt 0 Vulnerabilities gemeldet.

## Wartung

Audit erneut ausführen bei:

- Sprint-Close mit größeren Dependency-Updates.
- Neuem Major-Release einer Top-Level-Dependency (`fastapi`, `pydantic`, `react`, `vite`).
- CVE-Hinweis in Watch-Channels (z.B. GitHub Dependabot, Snyk Newsletter).

Ergebnis dokumentieren als neuer Audit-Eintrag in dieser Datei (Datum + Tabelle). Critical-/High-Findings müssen vor Sprint-Close behoben sein.

## Anhang — vollständiger pip-audit-Report (JSON, gekürzt)

Alle 50 Pakete mit `vulns: []`. Vollständige JSON-Ausgabe steht im Sprint-Snapshot. Beispielausschnitt:

```json
{
  "dependencies": [
    {"name": "fastapi", "version": "0.136.1", "vulns": []},
    {"name": "sqlalchemy", "version": "2.0.49", "vulns": []},
    {"name": "argon2-cffi", "version": "25.1.0", "vulns": []},
    {"name": "pyjwt", "version": "2.12.1", "vulns": []},
    {"name": "pillow", "version": "12.2.0", "vulns": []}
  ],
  "fixes": []
}
```
