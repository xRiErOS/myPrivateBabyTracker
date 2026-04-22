# MyBaby Authentifizierung — Uebersicht

MyBaby unterstuetzt vier Authentifizierungsmodi, konfigurierbar per Umgebungsvariable `AUTH_MODE`.

## Modi im Ueberblick

| Modus | AUTH_MODE | Beschreibung | Empfohlener Einsatz |
|-------|-----------|-------------|---------------------|
| Deaktiviert | `disabled` | Kein Login erforderlich | Home Lab hinter Authelia/VPN |
| Forward-Auth (SSO) | `forward` | Authelia/Nginx setzt Header | Produktion mit Reverse Proxy |
| Lokales Login | `local` | Username + Passwort (Argon2, JWT) | Standalone ohne Reverse Proxy |
| Kombimodus | `both` | Forward-Auth primaer, lokaler Login als Fallback | Flexibler Betrieb |

## Architektur

```
Browser ─── Reverse Proxy (NPM) ─── Authelia ─── MyBaby Container
                                                    │
                                            ┌───────┴────────┐
                                            │ HeaderStripping │ ← K1: Entfernt Auth-Header
                                            │   Middleware    │   von nicht-vertrauenswuerdigen IPs
                                            └───────┬────────┘
                                                    │
                                            ┌───────┴────────┐
                                            │  get_current_   │ ← FastAPI Dependency
                                            │     user()      │   Prueft AUTH_MODE
                                            └───────┬────────┘
                                                    │
                              ┌──────────┬──────────┼──────────┐
                              │          │          │          │
                           disabled   forward    local      both
                           → None    → Header   → JWT     → Forward
                                      User      Cookie      dann JWT
```

## Sicherheitskontrollen

| ID | Kontrolle | Beschreibung |
|----|-----------|-------------|
| K1 | HeaderStrippingMiddleware | Entfernt `Remote-User`, `Remote-Groups`, `Remote-Name`, `Remote-Email` von IPs ausserhalb `AUTH_TRUSTED_PROXIES` |
| K2 | CSRF Double-Submit-Cookie | Schuetzt POST/PUT/PATCH/DELETE gegen Cross-Site-Request-Forgery |
| K4 | SECRET_KEY Validierung | App startet nicht ohne min. 32 Zeichen langen Secret Key |

## Umgebungsvariablen

| Variable | Default | Beschreibung |
|----------|---------|-------------|
| `AUTH_MODE` | `forward` | Authentifizierungsmodus |
| `AUTH_TRUSTED_HEADER` | `Remote-User` | Name des Forward-Auth Headers |
| `AUTH_TRUSTED_PROXIES` | `192.168.178.0/24` | CIDR-Bereich vertrauenswuerdiger Proxies |
| `SECRET_KEY` | (Pflicht) | JWT-Signierung + CSRF. Min. 32 Zeichen |
| `ENVIRONMENT` | `dev` | `dev`/`staging`/`prod` — steuert Cookie Secure-Flag |

## Dokumentationsstruktur

| Datei | Inhalt |
|-------|--------|
| [01-disabled-mode.md](01-disabled-mode.md) | AUTH_MODE=disabled — Einrichtung und Hinweise |
| [02-forward-auth.md](02-forward-auth.md) | AUTH_MODE=forward — SSO mit Authelia |
| [03-local-login.md](03-local-login.md) | AUTH_MODE=local — Lokales Login mit Passwort |
| [04-totp-2fa.md](04-totp-2fa.md) | Zwei-Faktor-Authentifizierung (TOTP) |
| [05-passkeys-webauthn.md](05-passkeys-webauthn.md) | Passkeys (WebAuthn/FIDO2) |
| [06-api-reference.md](06-api-reference.md) | Vollstaendige API-Referenz aller Auth-Endpoints |

## Voraussetzungen

- MyBaby Container laeuft (Port 8080 extern → 8000 intern)
- `SECRET_KEY` ist gesetzt (min. 32 Zeichen)
- Alembic-Migrationen sind ausgefuehrt:
  ```bash
  sudo docker exec mybaby alembic -c /app/alembic.ini upgrade head
  ```
