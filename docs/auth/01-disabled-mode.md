# AUTH_MODE=disabled — Authentifizierung deaktiviert

## Wann verwenden

- MyBaby laeuft im Home Lab hinter einem Reverse Proxy mit eigener Authentifizierung (z.B. Authelia)
- Entwicklung und Testing (kein Login-Overhead)
- Einzelnutzer-Betrieb ohne Sicherheitsanforderungen

## Einrichtung

### 1. Umgebungsvariable setzen

In Portainer (Stack → Environment Variables) oder `.env`:

```env
AUTH_MODE=disabled
SECRET_KEY=dein-geheimer-schluessel-mindestens-32-zeichen
```

### 2. Container neu starten

```bash
# Portainer: Stack → Redeploy
# Oder manuell:
docker restart mybaby
```

### 3. Verifizieren

```bash
curl http://localhost:8080/api/v1/auth/status
```

Erwartete Antwort:
```json
{
  "auth_mode": "disabled",
  "authenticated": false,
  "user": null
}
```

## Verhalten

- **Keine Login-Seite**: Die App zeigt direkt das Dashboard
- **Kein Benutzerkontext**: `get_current_user()` gibt `None` zurueck
- **Alle API-Endpoints**: Frei zugaenglich ohne Authentifizierung
- **Rollenbasierte Zugriffskontrolle**: Deaktiviert — anonyme Nutzer erhalten implizit Admin-Rechte
- **Login-Endpoint**: Gibt HTTP 400 zurueck ("Lokales Login ist im aktuellen Auth-Modus nicht verfuegbar")

## Sicherheitshinweise

- **Nur verwenden, wenn die App anderweitig geschuetzt ist** (VPN, Reverse Proxy mit Auth)
- Ohne externen Schutz ist die gesamte App inkl. Admin-Bereich oeffentlich zugaenglich
- API-Keys (Machine-to-Machine) funktionieren weiterhin unabhaengig vom AUTH_MODE

## Frontend-Verhalten

Der `AuthGuard` in `App.tsx` erkennt `auth_mode=disabled` und zeigt die App direkt an — keine Weiterleitung zur Login-Seite.

```
GET /api/v1/auth/status → auth_mode="disabled"
  → AuthGuard: authMode === "disabled" → Render App
```
