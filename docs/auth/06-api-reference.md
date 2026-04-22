# Auth API-Referenz

Alle Endpoints unter `/api/v1/auth/`. Authentifizierte Requests benoetigen den `mybaby_session` Cookie (gesetzt durch Login).

## Core Auth

### POST /auth/login

Authentifizierung mit Username + Passwort + optionalem TOTP-Code.

**Verfuegbar in**: `AUTH_MODE=local`, `AUTH_MODE=both`

**Request Body:**
```json
{
  "username": "erik",
  "password": "MeinPasswort!",
  "totp_code": "123456"       // Optional, nur bei aktivierter 2FA
}
```

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `username` | string | ja | 1-100 Zeichen |
| `password` | string | ja | 1-200 Zeichen |
| `totp_code` | string | nein | 6 Ziffern, nur wenn 2FA aktiv |

**Antworten:**

| Status | Bedeutung | Body |
|--------|-----------|------|
| 200 | Erfolg oder 2FA erforderlich | `LoginResponse` |
| 400 | Auth-Modus unterstuetzt kein Login | `{"detail": "..."}` |
| 401 | Falsches Passwort/Code | `{"detail": "..."}` |
| 403 | Benutzer deaktiviert | `{"detail": "Benutzerkonto ist deaktiviert"}` |

**LoginResponse:**
```json
{
  "requires_totp": false,
  "user": {
    "id": 1,
    "username": "erik",
    "display_name": "Erik",
    "role": "admin",
    "auth_type": "local",
    "locale": "de",
    "totp_enabled": true,
    "created_at": "2026-04-22T05:30:00Z"
  }
}
```

Bei `requires_totp: true` ist `user` null — Frontend muss TOTP-Code abfragen und Login mit `totp_code` wiederholen.

**Cookie**: Setzt `mybaby_session` (httpOnly, 7 Tage) bei Erfolg.

### POST /auth/logout

Session beenden.

**Authentifizierung**: Keine erforderlich

**Response**: `204 No Content`

**Effekt**: Loescht den `mybaby_session` Cookie.

### GET /auth/me

Aktuellen Benutzer abrufen.

**Authentifizierung**: Erforderlich

**Antworten:**

| Status | Bedeutung |
|--------|-----------|
| 200 | `UserResponse` |
| 401 | Nicht authentifiziert |

**UserResponse:**
```json
{
  "id": 1,
  "username": "erik",
  "display_name": "Erik",
  "role": "admin",
  "auth_type": "local",
  "locale": "de",
  "totp_enabled": true,
  "created_at": "2026-04-22T05:30:00Z"
}
```

### GET /auth/status

Auth-Modus und Authentifizierungsstatus. Gibt **nie** 401 zurueck — sicher fuer unauthentifizierte Requests.

**Authentifizierung**: Keine erforderlich

**Response:**
```json
{
  "auth_mode": "local",
  "authenticated": true,
  "user": { ... }          // null wenn nicht authentifiziert
}
```

### POST /auth/change-password

Eigenes Passwort aendern.

**Authentifizierung**: Erforderlich, nur `auth_type=local`

**Request Body:**
```json
{
  "current_password": "AltesPasswort!",
  "new_password": "NeuesPasswort!"
}
```

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `current_password` | string | ja | 1-200 Zeichen |
| `new_password` | string | ja | 8-200 Zeichen |

**Antworten:**

| Status | Bedeutung |
|--------|-----------|
| 204 | Passwort geaendert |
| 400 | Kein lokaler Auth-Typ |
| 401 | Falsches aktuelles Passwort |

## TOTP 2FA

### GET /auth/2fa/status

TOTP-Status des aktuellen Benutzers.

**Response:**
```json
{
  "enabled": true,
  "verified": true
}
```

### POST /auth/2fa/setup

TOTP einrichten — generiert Secret, QR-Code und Backup-Codes.

**Einschraenkung**: Schlaegt fehl wenn 2FA bereits aktiv ist.

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code_base64": "iVBORw0KGgo...",
  "backup_codes": ["A1B2C3D4", "E5F6G7H8", "I9J0K1L2", "M3N4O5P6", "Q7R8S9T0", "U1V2W3X4", "Y5Z6A7B8", "C9D0E1F2"]
}
```

### POST /auth/2fa/verify

TOTP-Setup abschliessen — verifiziert ersten Code und aktiviert 2FA.

**Request Body:**
```json
{
  "code": "123456"
}
```

**Antworten:**

| Status | Bedeutung |
|--------|-----------|
| 204 | 2FA aktiviert |
| 400 | Kein Setup gestartet |
| 401 | Ungueltiger Code |

### POST /auth/2fa/disable

2FA deaktivieren (erfordert gueltigen TOTP-Code).

**Request Body:**
```json
{
  "code": "123456"
}
```

**Antworten:**

| Status | Bedeutung |
|--------|-----------|
| 204 | 2FA deaktiviert |
| 400 | 2FA war nicht aktiv |
| 401 | Ungueltiger Code |

### POST /auth/2fa/validate

TOTP-Code validieren (fuer programmatische Nutzung, z.B. nach Passwort-Auth).

**Request Body:**
```json
{
  "code": "123456"
}
```

### POST /auth/2fa/backup-verify

Backup-Code verwenden (einmalig).

**Request Body:**
```json
{
  "code": "A1B2C3D4"
}
```

**Antworten:**

| Status | Bedeutung |
|--------|-----------|
| 204 | Code akzeptiert (verbraucht) |
| 400 | 2FA nicht aktiv oder keine Codes |
| 401 | Ungueltiger Code |

## WebAuthn (Passkeys)

### POST /auth/webauthn/register/begin

Passkey-Registrierung starten. Gibt `PublicKeyCredentialCreationOptions` zurueck.

**Authentifizierung**: Erforderlich

**Response**: PublicKeyCredentialCreationOptions (JSON)

**Cookie**: Setzt `webauthn_challenge` (httpOnly, 5 Min TTL)

### POST /auth/webauthn/register/finish

Passkey-Registrierung abschliessen. Body ist die serialisierte `PublicKeyCredential` vom Browser.

**Authentifizierung**: Erforderlich + `webauthn_challenge` Cookie

**Response:**
```json
{
  "id": 1,
  "message": "Passkey registriert"
}
```

### POST /auth/webauthn/login/begin

Passkey-Login starten. Gibt `PublicKeyCredentialRequestOptions` zurueck.

**Authentifizierung**: Keine erforderlich

**Response**: PublicKeyCredentialRequestOptions (JSON)

### POST /auth/webauthn/login/finish

Passkey-Login abschliessen. Body ist die serialisierte Assertion vom Browser.

**Authentifizierung**: Keine erforderlich + `webauthn_challenge` Cookie

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "erik",
    ...
  }
}
```

**Cookie**: Setzt `mybaby_session` (JWT)

### GET /auth/webauthn/credentials

Alle Passkeys des aktuellen Benutzers.

**Response:**
```json
[
  {
    "id": 1,
    "device_name": "iPhone Erik",
    "created_at": "2026-04-22T05:30:00Z"
  }
]
```

### PATCH /auth/webauthn/credentials/{id}

Passkey umbenennen.

**Request Body:**
```json
{
  "device_name": "Neuer Name"
}
```

### DELETE /auth/webauthn/credentials/{id}

Passkey loeschen.

**Response**: `204 No Content`

## Datenmodelle

### User

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255),          -- NULL fuer Forward-Auth-User
  display_name VARCHAR(200),
  auth_type VARCHAR(20) NOT NULL,      -- 'local' | 'forward_auth'
  is_active BOOLEAN NOT NULL DEFAULT 1,
  role VARCHAR(20) NOT NULL DEFAULT 'caregiver',  -- 'admin' | 'caregiver'
  locale VARCHAR(10) NOT NULL DEFAULT 'de',
  totp_enabled BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### TotpSecret

```sql
CREATE TABLE totp_secrets (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  secret VARCHAR(64) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT 0,
  backup_codes TEXT,                   -- JSON: ["sha256hash1", "sha256hash2", ...]
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### WebAuthnCredential

```sql
CREATE TABLE webauthn_credentials (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id BLOB UNIQUE NOT NULL,
  public_key BLOB NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0,
  device_name VARCHAR(200),
  transports TEXT,                     -- JSON array (optional)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
