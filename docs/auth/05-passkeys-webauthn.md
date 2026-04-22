# Passkeys (WebAuthn/FIDO2)

## Voraussetzungen

- `AUTH_MODE=local` oder `AUTH_MODE=both`
- Eingeloggt (Passkey-Registrierung erfordert bestehende Session)
- Browser mit WebAuthn-Unterstuetzung:
  - iOS Safari 16+ (Face ID / Touch ID)
  - Chrome 67+ (Windows Hello, Android Biometrics, Security Keys)
  - Firefox 60+
  - Edge 79+

## Funktionsweise

Passkeys ermoglichen passwordloses Login ueber biometrische Sensoren (Fingerabdruck, Gesichtserkennung) oder Hardware-Security-Keys. Der private Schluessel verlsst nie das Geraet.

```
Registrierung:
1. POST /auth/webauthn/register/begin → Challenge + Options
2. Browser: navigator.credentials.create() → Biometrie/PIN
3. POST /auth/webauthn/register/finish → Credential gespeichert

Login:
1. POST /auth/webauthn/login/begin → Challenge
2. Browser: navigator.credentials.get() → Biometrie/PIN
3. POST /auth/webauthn/login/finish → JWT Cookie gesetzt
```

## Passkey registrieren (UI)

### Schritt 1: Auth-Einstellungen oeffnen

Navigiere zu **Verwaltung → Authentifizierung** (`/admin/auth`).

### Schritt 2: Passkey hinzufuegen

Im Abschnitt "Passkeys" auf **"Passkey hinzufuegen"** klicken.

### Schritt 3: Biometrie/PIN bestaetigen

Der Browser zeigt einen nativen Dialog:
- **iOS**: Face ID oder Touch ID
- **Chrome (Desktop)**: Windows Hello, Touch ID (Mac), oder Security Key
- **Android**: Fingerabdruck oder Bildschirmsperre

### Schritt 4: Passkey benennen (optional)

Nach der Registrierung erscheint der neue Passkey in der Liste. Ueber das Stift-Symbol kann ein Geraetename vergeben werden (z.B. "iPhone Erik", "MacBook").

## Mit Passkey anmelden

### Browser

1. Login-Seite oeffnen
2. Auf **"Mit Passkey anmelden"** klicken (sapphire-farbener Button unter dem Login-Formular)
3. Browser zeigt biometrischen Dialog → bestaetigen
4. Bei Erfolg: Automatische Weiterleitung zum Dashboard

### Hinweis: Kein TOTP noetig

Passkey-Login umgeht die TOTP-Pruefung — die biometrische Verifizierung gilt als zweiter Faktor.

## Passkeys verwalten

### Liste anzeigen

In `/admin/auth` → Abschnitt "Passkeys" werden alle registrierten Passkeys mit Geraetename und Erstellungsdatum angezeigt.

### Passkey umbenennen

Stift-Symbol klicken → neuen Namen eingeben → **"OK"** klicken.

### Passkey loeschen

Muelleimer-Symbol klicken. Der Passkey wird sofort geloescht — keine Bestaetigung.

**Achtung**: Nach dem Loeschen kann der Passkey nicht wiederhergestellt werden. Stelle sicher, dass alternative Anmeldemethoden verfuegbar sind.

## API-Referenz

### Registrierung starten

```bash
curl -X POST http://localhost:8080/api/v1/auth/webauthn/register/begin \
  -b cookies.txt
# → PublicKeyCredentialCreationOptions (JSON)
# → Cookie: webauthn_challenge (5 Minuten gueltig)
```

### Registrierung abschliessen

```bash
curl -X POST http://localhost:8080/api/v1/auth/webauthn/register/finish \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "id": "...",
    "rawId": "...",
    "type": "public-key",
    "response": {
      "attestationObject": "...",
      "clientDataJSON": "..."
    }
  }'
# → {"id": 1, "message": "Passkey registriert"}
```

### Login starten

```bash
curl -X POST http://localhost:8080/api/v1/auth/webauthn/login/begin
# → PublicKeyCredentialRequestOptions (JSON)
# → Cookie: webauthn_challenge
```

### Login abschliessen

```bash
curl -X POST http://localhost:8080/api/v1/auth/webauthn/login/finish \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "id": "...",
    "rawId": "...",
    "type": "public-key",
    "response": {
      "authenticatorData": "...",
      "clientDataJSON": "...",
      "signature": "...",
      "userHandle": "..."
    }
  }'
# → {"user": {"id": 1, "username": "erik", ...}}
# → Cookie: mybaby_session (JWT)
```

### Credentials auflisten

```bash
curl http://localhost:8080/api/v1/auth/webauthn/credentials -b cookies.txt
# → [{"id": 1, "device_name": "iPhone Erik", "created_at": "2026-04-22T..."}]
```

### Credential umbenennen

```bash
curl -X PATCH http://localhost:8080/api/v1/auth/webauthn/credentials/1 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"device_name": "iPhone Erik (neu)"}'
```

### Credential loeschen

```bash
curl -X DELETE http://localhost:8080/api/v1/auth/webauthn/credentials/1 \
  -b cookies.txt
# → 204 No Content
```

## Technische Details

| Eigenschaft | Wert |
|-------------|------|
| Bibliothek | py_webauthn (webauthn) 2.0+ |
| Relying Party ID | `baby.familie-riedel.org` (prod) / `localhost` (dev) |
| Relying Party Name | "MyBaby" |
| Resident Key | `preferred` (Discoverable Credentials bevorzugt) |
| User Verification | `preferred` |
| Challenge-Speicherung | httpOnly Cookie (`webauthn_challenge`, 5 Min TTL) |
| Credential-Speicherung | `credential_id` (bytes) + `public_key` (bytes) in SQLite |
| Sign Count | Wird bei jedem Login aktualisiert (Klonschutz) |

## Relying Party ID (RP_ID)

Die RP_ID ist an die Domain gebunden. Passkeys, die fuer `baby.familie-riedel.org` registriert wurden, funktionieren **nur** auf dieser Domain.

| Umgebung | RP_ID | Origin |
|----------|-------|--------|
| `ENVIRONMENT=prod` | `baby.familie-riedel.org` | `https://baby.familie-riedel.org` |
| `ENVIRONMENT=dev` | `localhost` | `http://localhost:5173` |

**Wichtig**: Bei einem Domain-Wechsel werden alle bestehenden Passkeys ungueltig und muessen neu registriert werden.

## Mehrere Passkeys

Ein Benutzer kann beliebig viele Passkeys registrieren — z.B. einen pro Geraet:

- iPhone (Face ID)
- MacBook (Touch ID)
- YubiKey (Hardware Security Key)

Bei der Registrierung werden bereits existierende Credentials als `excludeCredentials` uebergeben, sodass ein Geraet nicht doppelt registriert wird.

## Troubleshooting

| Problem | Ursache | Loesung |
|---------|---------|---------|
| "Passkey-Registrierung fehlgeschlagen" | Browser unterstuetzt kein WebAuthn | Aktuelle Browser-Version verwenden |
| "Keine Challenge gefunden" | Challenge-Cookie abgelaufen (> 5 Min) | Registrierung erneut starten |
| Passkey funktioniert auf anderer Domain nicht | RP_ID stimmt nicht mit Domain ueberein | Passkeys sind domain-gebunden — neu registrieren |
| "Passkey nicht gefunden" bei Login | Credential in DB geloescht oder nie registriert | Passkey erneut registrieren |
| Sign Count Mismatch | Geklonter Authenticator erkannt | Passkey loeschen und neu registrieren |
| Button "Mit Passkey anmelden" nicht sichtbar | Browser hat kein `window.PublicKeyCredential` | WebAuthn wird nicht unterstuetzt — alternatives Login verwenden |
