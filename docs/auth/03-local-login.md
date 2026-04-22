# AUTH_MODE=local — Lokales Login mit Passwort

## Wann verwenden

- MyBaby laeuft ohne Reverse Proxy oder ohne Forward-Auth
- Direkter Zugriff ueber IP/Port (z.B. `http://192.168.178.185:8080`)
- Standalone-Betrieb mit eigener Benutzerverwaltung

## Einrichtung

### 1. Umgebungsvariablen setzen

```env
AUTH_MODE=local
SECRET_KEY=dein-geheimer-schluessel-mindestens-32-zeichen
ENVIRONMENT=prod
```

### 2. Container neu starten

```bash
docker restart mybaby
```

### 3. Ersten Admin-Benutzer anlegen

Da es keinen Registrierungs-Endpoint gibt, muss der erste Benutzer direkt in der Datenbank angelegt werden:

```bash
# In den Container wechseln
sudo docker exec -it mybaby /bin/bash

# Python-Shell oeffnen
python3 -c "
from app.middleware.auth import hash_password

# Passwort hashen (Argon2id)
pw_hash = hash_password('DeinSicheresPasswort123!')
print(f'Hash: {pw_hash}')
"
```

Dann den User in SQLite einfuegen:

```bash
sudo docker exec mybaby python3 -c "
import sqlite3
from app.middleware.auth import hash_password

conn = sqlite3.connect('/app/data/mybaby.db')
conn.execute(
    'INSERT INTO users (username, password_hash, display_name, auth_type, is_active, role, locale, totp_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ('erik', hash_password('DeinSicheresPasswort123!'), 'Erik', 'local', 1, 'admin', 'de', 0)
)
conn.commit()
conn.close()
print('Admin-User erik erstellt')
"
```

**Alternativ** als Einzeiler:

```bash
sudo docker exec mybaby python3 -c "
import sqlite3; from app.middleware.auth import hash_password; conn = sqlite3.connect('/app/data/mybaby.db'); conn.execute('INSERT INTO users (username, password_hash, display_name, auth_type, is_active, role, locale, totp_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ('erik', hash_password('MeinPasswort!'), 'Erik', 'local', 1, 'admin', 'de', 0)); conn.commit(); print('Done')
"
```

### 4. Verifizieren

```bash
curl http://localhost:8080/api/v1/auth/status
```

Erwartete Antwort (nicht eingeloggt):
```json
{
  "auth_mode": "local",
  "authenticated": false,
  "user": null
}
```

## Login-Flow

### Browser (Frontend)

1. App laedt → `GET /api/v1/auth/status` → `auth_mode=local`, `authenticated=false`
2. `AuthGuard` zeigt `LoginPage`
3. Nutzer gibt Username + Passwort ein
4. `POST /api/v1/auth/login` → Argon2-Verifizierung → JWT Cookie gesetzt
5. Bei 2FA aktiv: Response `{"requires_totp": true}` → TOTP-Code-Eingabe → erneuter Login mit Code
6. Erfolgreich: Dashboard wird angezeigt

### API (curl)

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"erik","password":"DeinSicheresPasswort123!"}' \
  -c cookies.txt

# Antwort (ohne 2FA):
# {"requires_totp":false,"user":{"id":1,"username":"erik","role":"admin",...}}

# Geschuetzter Endpoint mit Cookie:
curl http://localhost:8080/api/v1/auth/me -b cookies.txt

# Logout
curl -X POST http://localhost:8080/api/v1/auth/logout -b cookies.txt
```

## JWT Session-Cookie

| Eigenschaft | Wert |
|-------------|------|
| Cookie-Name | `mybaby_session` |
| Typ | httpOnly (nicht per JavaScript lesbar) |
| Secure | `true` in prod, `false` in dev |
| SameSite | `lax` |
| Gueltigkeitsdauer | 7 Tage |
| Algorithmus | HS256 |
| Payload | `{"sub": "<user_id>", "iat": ..., "exp": ...}` |

Nach Ablauf der 7 Tage muss der Nutzer sich erneut anmelden. Es gibt keinen automatischen Token-Refresh.

## Passwort-Anforderungen

| Kriterium | Wert |
|-----------|------|
| Minimale Laenge | 8 Zeichen (bei Aenderung ueber API) |
| Maximale Laenge | 200 Zeichen |
| Hashing-Algorithmus | Argon2id (via argon2-cffi) |
| Validierung | Nur Laenge — keine Komplexitaetsregeln erzwungen |

## Passwort aendern

Ueber die UI: `/admin/auth` → Abschnitt "Passwort aendern"

Ueber die API:
```bash
curl -X POST http://localhost:8080/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "current_password": "AltesPasswort!",
    "new_password": "NeuesSicheresPasswort!"
  }'
# → 204 No Content (Erfolg)
```

Einschraenkungen:
- Nur fuer Benutzer mit `auth_type=local` (Forward-Auth-Benutzer haben kein Passwort)
- Aktuelles Passwort muss korrekt eingegeben werden

## Benutzerrollen

| Rolle | Rechte |
|-------|--------|
| `admin` | Vollzugriff inkl. Verwaltungsbereich |
| `caregiver` | Standard-Tracking-Funktionen |

Rollen werden beim Erstellen des Benutzers festgelegt. Es gibt aktuell kein UI zum Aendern von Rollen — dies muss direkt in der Datenbank erfolgen:

```bash
sudo docker exec mybaby python3 -c "
import sqlite3
conn = sqlite3.connect('/app/data/mybaby.db')
conn.execute('UPDATE users SET role=? WHERE username=?', ('admin', 'julia'))
conn.commit()
print('Rolle aktualisiert')
"
```

## Weiteren Benutzer hinzufuegen

```bash
sudo docker exec mybaby python3 -c "
import sqlite3; from app.middleware.auth import hash_password
conn = sqlite3.connect('/app/data/mybaby.db')
conn.execute(
    'INSERT INTO users (username, password_hash, display_name, auth_type, is_active, role, locale, totp_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ('julia', hash_password('JuliasPasswort!'), 'Julia', 'local', 1, 'caregiver', 'de', 0)
)
conn.commit()
print('User julia erstellt')
"
```

## Troubleshooting

| Problem | Ursache | Loesung |
|---------|---------|---------|
| Login gibt 400 | `AUTH_MODE` ist nicht `local` oder `both` | Umgebungsvariable pruefen |
| Login gibt 401 | Falsches Passwort oder User existiert nicht | Credentials pruefen, User in DB verifizieren |
| Login gibt 403 | User ist deaktiviert (`is_active=0`) | In DB aktivieren: `UPDATE users SET is_active=1 WHERE username='...'` |
| Cookie wird nicht gesetzt | `ENVIRONMENT=dev` + Browser blockiert unsichere Cookies | Auf `ENVIRONMENT=prod` setzen oder HTTP verwenden |
| Nach 7 Tagen ausgeloggt | JWT ist abgelaufen | Normal — erneut einloggen |
