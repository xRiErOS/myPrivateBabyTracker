# Zwei-Faktor-Authentifizierung (TOTP)

## Voraussetzungen

- `AUTH_MODE=local` oder `AUTH_MODE=both`
- Benutzer mit `auth_type=local` (Forward-Auth-Benutzer koennen kein TOTP einrichten)
- Authenticator-App auf dem Smartphone (z.B. Google Authenticator, Authy, 1Password, Bitwarden)

## Funktionsweise

TOTP (Time-based One-Time Password) generiert alle 30 Sekunden einen neuen 6-stelligen Code basierend auf einem geteilten Geheimnis. Nach Aktivierung muss bei jedem Login zusaetzlich zum Passwort ein TOTP-Code eingegeben werden.

```
Login-Flow mit 2FA:

1. POST /auth/login {username, password}
   → Response: {"requires_totp": true}

2. POST /auth/login {username, password, totp_code: "123456"}
   → Response: {"requires_totp": false, "user": {...}}
   → Cookie: mybaby_session (JWT)
```

## 2FA einrichten (UI)

### Schritt 1: Auth-Einstellungen oeffnen

Navigiere zu **Verwaltung → Authentifizierung** (`/admin/auth`).

### Schritt 2: 2FA einrichten klicken

Im Abschnitt "Zwei-Faktor-Authentifizierung (2FA)" auf **"2FA einrichten"** klicken.

### Schritt 3: QR-Code scannen

1. Authenticator-App oeffnen
2. QR-Code scannen (oder manuellen Schluessel eingeben)
3. Die App zeigt nun alle 30 Sekunden einen 6-stelligen Code

### Schritt 4: Backup-Codes sichern

Es werden **8 Backup-Codes** angezeigt. Diese sind einmalig verwendbar und dienen als Notfall-Zugang, falls die Authenticator-App nicht verfuegbar ist.

**Backup-Codes sicher aufbewahren** — sie werden nur einmal angezeigt und koennen nicht erneut abgerufen werden.

### Schritt 5: Bestaetigen

Aktuellen 6-stelligen Code aus der Authenticator-App eingeben und **"Aktivieren"** klicken. Erst nach erfolgreicher Verifizierung wird 2FA aktiviert.

## 2FA einrichten (API)

```bash
# Schritt 1: Setup starten (eingeloggt)
curl -X POST http://localhost:8080/api/v1/auth/2fa/setup \
  -b cookies.txt

# Antwort:
# {
#   "secret": "JBSWY3DPEHPK3PXP",
#   "qr_code_base64": "iVBORw0KGgo...",
#   "backup_codes": ["A1B2C3D4", "E5F6G7H8", ...]
# }

# Schritt 2: Code aus Authenticator-App verifizieren
curl -X POST http://localhost:8080/api/v1/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"code": "123456"}'
# → 204 No Content (2FA aktiviert)

# Status pruefen
curl http://localhost:8080/api/v1/auth/2fa/status -b cookies.txt
# → {"enabled": true, "verified": true}
```

## Login mit 2FA

### Browser

1. Username + Passwort eingeben → **"Anmelden"** klicken
2. App zeigt TOTP-Eingabefeld: "Gib den 6-stelligen Code aus deiner Authenticator-App ein"
3. Code eingeben → **"Anmelden"** klicken
4. Bei korrektem Code: Dashboard wird angezeigt

### API

```bash
# Erster Request: Passwort
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"erik","password":"MeinPasswort!"}'
# → {"requires_totp": true, "user": null}

# Zweiter Request: Passwort + TOTP-Code
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"erik","password":"MeinPasswort!","totp_code":"123456"}' \
  -c cookies.txt
# → {"requires_totp": false, "user": {"username": "erik", ...}}
```

## Backup-Codes verwenden

Wenn die Authenticator-App nicht verfuegbar ist (Handy verloren, App geloescht):

```bash
curl -X POST http://localhost:8080/api/v1/auth/2fa/backup-verify \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"code": "A1B2C3D4"}'
# → 204 No Content (Code akzeptiert und verbraucht)
```

Jeder Backup-Code kann nur **einmal** verwendet werden. Nach Verwendung wird er aus der Liste entfernt.

## 2FA deaktivieren

### UI

In `/admin/auth` → Abschnitt "2FA ist aktiviert" → Aktuellen TOTP-Code eingeben → **"Deaktivieren"** klicken.

### API

```bash
curl -X POST http://localhost:8080/api/v1/auth/2fa/disable \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"code": "123456"}'
# → 204 No Content (2FA deaktiviert)
```

Zum Deaktivieren muss ein gueltiger TOTP-Code eingegeben werden — das verhindert unbefugtes Deaktivieren.

## Technische Details

| Eigenschaft | Wert |
|-------------|------|
| Algorithmus | TOTP (RFC 6238) |
| Zeitschritt | 30 Sekunden |
| Code-Laenge | 6 Ziffern |
| Gueltigkeitsfenster | +/- 1 Zeitschritt (erlaubt ~30s Zeitabweichung) |
| Secret-Laenge | 32 Zeichen (Base32) |
| Backup-Codes | 8 Stueck, 8 Zeichen Hex (uppercase) |
| Backup-Code-Speicherung | SHA256-Hash in DB (Klartext nicht rekonstruierbar) |
| Bibliothek | pyotp 2.9+ |
| QR-Code | PNG via qrcode[pil], Base64-kodiert |
| Issuer | "MyBaby" (in Authenticator-App angezeigt) |

## Notfall: 2FA zuruecksetzen ohne Code

Falls sowohl Authenticator-App als auch Backup-Codes verloren sind:

```bash
sudo docker exec mybaby python3 -c "
import sqlite3
conn = sqlite3.connect('/app/data/mybaby.db')
# 2FA deaktivieren
conn.execute('UPDATE users SET totp_enabled=0 WHERE username=\"erik\"')
conn.execute('DELETE FROM totp_secrets WHERE user_id=(SELECT id FROM users WHERE username=\"erik\")')
conn.commit()
print('2FA fuer erik zurueckgesetzt')
"
```

**Achtung**: Dies umgeht die 2FA-Sicherheit. Nur verwenden, wenn kein anderer Zugang moeglich ist.

## Troubleshooting

| Problem | Ursache | Loesung |
|---------|---------|---------|
| Code wird abgelehnt | Zeitabweichung > 30 Sekunden | Uhrzeit auf Server und Smartphone synchronisieren |
| QR-Code nicht scannbar | Bildqualitaet oder Kamera-Problem | Manuellen Schluessel verwenden (aufklappbar unter QR-Code) |
| Setup gibt 400 "2FA bereits aktiviert" | 2FA war schon aktiv | Erst deaktivieren, dann neu einrichten |
| Backup-Code wird abgelehnt | Code bereits verwendet oder falsch geschrieben | Gross-/Kleinschreibung beachten (Codes sind uppercase Hex) |
