# MyBaby -- Manuelles Test-Handbuch

## 1. Lokales Dev-Setup

### Backend starten

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Environment-Variablen setzen (siehe .env.example)
cp .env.example .env
# Mindestens diese Variablen anpassen:
#   SECRET_KEY=<min 32 Zeichen>
#   DATABASE_URL=sqlite:///./data/mybaby.db

# Datenbank initialisieren
alembic upgrade head

# Server starten
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend starten

```bash
cd frontend
npm install
npm run dev
# Vite Dev-Server laeuft auf http://localhost:5173
# API-Proxy in vite.config.ts zeigt auf http://localhost:8000
```

### Wichtige Environment-Variablen

| Variable | Beschreibung | Pflicht |
|----------|-------------|---------|
| `SECRET_KEY` | Min. 32 Zeichen, App verweigert Start ohne | Ja |
| `DATABASE_URL` | SQLite-Pfad, Default: `sqlite:///./data/mybaby.db` | Ja |
| `ALLOWED_ORIGINS` | CORS Origins fuer Frontend | Ja |
| `LOG_LEVEL` | structlog Level (default: `info`) | Nein |
| `AUTH_MODE` | `forward` (Authelia) oder `local` (Argon2) | Ja |

## 2. API-Tests pro Plugin

Basis-URL: `http://localhost:8000/api/v1`

Alle Timestamps im ISO 8601 Format mit UTC-Offset. Die API konvertiert zu UTC vor Speicherung.

### 2.1 Sleep (Schlaf)

**POST -- Schlaf-Eintrag erstellen**

```bash
http POST localhost:8000/api/v1/sleep/ \
  start="2026-04-19T20:30:00+02:00" \
  end="2026-04-20T06:15:00+02:00" \
  note="Durchgeschlafen"
```

Erwartung: `201 Created`, Response enthaelt `id`, Timestamps in UTC.

**GET -- Liste abrufen**

```bash
http GET localhost:8000/api/v1/sleep/
```

Erwartung: `200 OK`, JSON-Array mit allen Schlaf-Eintraegen.

**GET -- Einzeleintrag**

```bash
http GET localhost:8000/api/v1/sleep/1
```

Erwartung: `200 OK` bei existierendem Eintrag, `404 Not Found` bei unbekannter ID.

**PATCH -- Eintrag aktualisieren**

```bash
http PATCH localhost:8000/api/v1/sleep/1 \
  note="Durchgeschlafen, einmal kurz wach"
```

Erwartung: `200 OK`, aktualisierter Eintrag in Response.

**DELETE -- Eintrag loeschen**

```bash
http DELETE localhost:8000/api/v1/sleep/1
```

Erwartung: `204 No Content`. Erneuter GET auf `/sleep/1` liefert `404`.

### 2.2 Feeding (Fuetterung)

**POST -- Fuetterung erstellen**

```bash
http POST localhost:8000/api/v1/feeding/ \
  start="2026-04-19T14:00:00+02:00" \
  end="2026-04-19T14:20:00+02:00" \
  type="bottle" \
  amount=120 \
  note="Pre-Nahrung"
```

Erwartung: `201 Created`.

**GET -- Liste**

```bash
http GET localhost:8000/api/v1/feeding/
```

Erwartung: `200 OK`.

**GET -- Einzeleintrag**

```bash
http GET localhost:8000/api/v1/feeding/1
```

**PATCH -- Aktualisieren**

```bash
http PATCH localhost:8000/api/v1/feeding/1 \
  amount=150
```

Erwartung: `200 OK`, `amount` ist 150.

**DELETE -- Loeschen**

```bash
http DELETE localhost:8000/api/v1/feeding/1
```

Erwartung: `204 No Content`.

### 2.3 Diaper (Windel)

**POST -- Windel-Eintrag erstellen**

```bash
http POST localhost:8000/api/v1/diaper/ \
  time="2026-04-19T10:30:00+02:00" \
  wet=true \
  solid=false \
  note=""
```

Erwartung: `201 Created`.

**GET -- Liste**

```bash
http GET localhost:8000/api/v1/diaper/
```

**GET -- Einzeleintrag**

```bash
http GET localhost:8000/api/v1/diaper/1
```

**PATCH -- Aktualisieren**

```bash
http PATCH localhost:8000/api/v1/diaper/1 \
  solid=true
```

**DELETE -- Loeschen**

```bash
http DELETE localhost:8000/api/v1/diaper/1
```

### HTTP-Status-Code Referenz

| Code | Bedeutung |
|------|-----------|
| `200` | Erfolgreich (GET, PATCH) |
| `201` | Erstellt (POST) |
| `204` | Geloescht (DELETE) |
| `401` | Nicht authentifiziert |
| `404` | Ressource nicht gefunden |
| `422` | Validierungsfehler (Pydantic) |
| `429` | Rate-Limit ueberschritten |

## 3. Browser/UI-Tests

### Voraussetzungen

- Backend + Frontend laufen lokal
- Browser: Chrome oder Safari (fuer iOS-Simulation)

### Checkliste pro Plugin (Sleep, Feeding, Diaper)

- [ ] Dashboard oeffnen -- Plugin-Widget ist sichtbar
- [ ] Widget zeigt aktuelle Zusammenfassung (letzter Eintrag, Tagesstatistik)
- [ ] "Neuer Eintrag"-Button oeffnet Formular
- [ ] Formular: Alle Felder ausfuellbar, Zeitauswahl funktioniert
- [ ] Formular absenden -- Toast-Benachrichtigung erscheint
- [ ] Liste oeffnen -- neuer Eintrag ist vorhanden
- [ ] Eintrag antippen -- Bearbeiten-Overlay oeffnet sich (EntryListOverlay)
- [ ] Eintrag bearbeiten -- Aenderung wird gespeichert
- [ ] Eintrag loeschen -- Undo-Toast erscheint (5s Timeout)
- [ ] Nach Undo: Eintrag ist wieder da

### Dark/Light Mode

- [ ] System-Einstellung wechseln (macOS: Systemeinstellungen > Erscheinungsbild)
- [ ] Latte (Light): Hintergrund `#eff1f5`, Text `#4c4f69`
- [ ] Macchiato (Dark): Hintergrund `#24273a`, Text `#cad3f5`
- [ ] Karten-Hintergrund passt sich an (`surface0`)
- [ ] Alle Akzentfarben sichtbar und lesbar
- [ ] Keine hart-kodierten Farben (alles ueber CSS-Variablen)

### Touch-Tauglichkeit

- [ ] Alle klickbaren Elemente mindestens 44x44px
- [ ] Buttons haben ausreichend Abstand zueinander
- [ ] Formulare: Kein Auto-Zoom auf iOS (font-size >= 16px auf Inputs)
- [ ] Tab-Bar am unteren Bildschirmrand erreichbar
- [ ] Swipe-Gesten funktionieren (falls implementiert)

### PWA-Verhalten

- [ ] App zum Homescreen hinzufuegen (iOS Safari: Teilen > Zum Home-Bildschirm)
- [ ] Standalone-Modus: Keine Browser-Adressleiste sichtbar
- [ ] Status-Bar-Styling korrekt (meta theme-color)

## 4. Auth-Tests

### Forward-Auth (Authelia, Produktiv-Modus)

```bash
# Ohne Auth-Header -- muss 401 liefern
http GET localhost:8000/api/v1/sleep/

# Mit Forward-Auth-Header -- muss 200 liefern
http GET localhost:8000/api/v1/sleep/ \
  X-Forwarded-User:erik
```

Erwartung: Ohne Header `401 Unauthorized`, mit Header `200 OK`.

### Header-Stripping (K1)

```bash
# Externer Request mit gefaelschtem Header -- muss gestrippt werden
http GET localhost:8000/api/v1/sleep/ \
  X-Forwarded-User:admin \
  X-Real-IP:1.2.3.4
```

Erwartung: Die Header-Stripping-Middleware entfernt `X-Forwarded-User` bei externen Requests. Nur der Reverse-Proxy (Authelia) darf diesen Header setzen.

### Local Auth (Entwicklungsmodus)

```bash
# Login
http POST localhost:8000/api/v1/auth/login \
  username=admin \
  password=changeme

# Response enthaelt Set-Cookie mit Session-Token

# Geschuetzter Endpoint mit Cookie
http GET localhost:8000/api/v1/sleep/ \
  Cookie:"session=<token-aus-login-response>"

# Logout
http POST localhost:8000/api/v1/auth/logout \
  Cookie:"session=<token>"
```

### CSRF-Token (K2)

```bash
# GET-Request setzt CSRF-Cookie
http GET localhost:8000/api/v1/sleep/ -v

# Im Response-Header pruefen:
# Set-Cookie: csrftoken=<token>; Path=/; SameSite=Strict

# POST ohne CSRF-Token -- muss 403 liefern
http POST localhost:8000/api/v1/sleep/ \
  start="2026-04-19T20:30:00+02:00" \
  end="2026-04-20T06:15:00+02:00"

# POST mit CSRF-Token -- muss 201 liefern
http POST localhost:8000/api/v1/sleep/ \
  X-CSRF-Token:<token-aus-cookie> \
  Cookie:"csrftoken=<token>" \
  start="2026-04-19T20:30:00+02:00" \
  end="2026-04-20T06:15:00+02:00"
```

## 5. Security-Validierung

### CSP-Header pruefen (K2)

1. Browser DevTools oeffnen (F12)
2. Network-Tab > beliebigen Request anklicken
3. Response Headers pruefen:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com
```

- [ ] `Content-Security-Policy` Header vorhanden
- [ ] `default-src 'self'` gesetzt
- [ ] Keine `unsafe-eval` in `script-src`

### Rate-Limiting testen (slowapi)

```bash
# 10 Requests schnell hintereinander senden
for i in $(seq 1 15); do
  http POST localhost:8000/api/v1/feeding/ \
    start="2026-04-19T14:00:00+02:00" \
    end="2026-04-19T14:20:00+02:00" \
    type="bottle" \
    amount=120 \
    2>&1 | grep "HTTP/"
done
```

Erwartung: Nach ca. 10 Requests kommt `429 Too Many Requests`.

### Input-Validation (K3 -- Pydantic)

```bash
# Zu langer String (max_length=2000)
http POST localhost:8000/api/v1/sleep/ \
  start="2026-04-19T20:30:00+02:00" \
  end="2026-04-20T06:15:00+02:00" \
  note="$(python3 -c 'print("x" * 2001)')"
```

Erwartung: `422 Unprocessable Entity` mit Pydantic-Fehlermeldung.

```bash
# Negative Menge
http POST localhost:8000/api/v1/feeding/ \
  start="2026-04-19T14:00:00+02:00" \
  end="2026-04-19T14:20:00+02:00" \
  type="bottle" \
  amount=-50
```

Erwartung: `422 Unprocessable Entity` (Pydantic `ge=0` Constraint).

```bash
# Ungueltiges Datumsformat
http POST localhost:8000/api/v1/sleep/ \
  start="nicht-ein-datum" \
  end="2026-04-20T06:15:00+02:00"
```

Erwartung: `422 Unprocessable Entity`.

### SECRET_KEY Validierung (K4)

```bash
# Ohne SECRET_KEY starten -- App muss Startfehler werfen
unset SECRET_KEY
uvicorn app.main:app
```

Erwartung: App startet nicht, Fehlermeldung verweist auf fehlenden SECRET_KEY.

```bash
# Zu kurzer SECRET_KEY
SECRET_KEY="kurz" uvicorn app.main:app
```

Erwartung: App startet nicht, Fehlermeldung verweist auf Mindestlaenge (32 Zeichen).

## 6. Docker-Test

### Image bauen

```bash
cd /path/to/myPrivateBabyTracker
docker build -t mybaby:local .
```

Erwartung: Multi-Stage Build (node:22-alpine + python:3.12-slim) laeuft erfolgreich durch.

### Container starten

```bash
docker run -d \
  --name mybaby-test \
  -p 8080:8000 \
  -e SECRET_KEY="$(openssl rand -hex 32)" \
  -e DATABASE_URL="sqlite:///./data/mybaby.db" \
  -e AUTH_MODE="local" \
  -v mybaby-data:/app/data \
  mybaby:local
```

### Health-Endpoint pruefen

```bash
http GET localhost:8080/api/v1/health
```

Erwartung: `200 OK` mit JSON `{"status": "healthy"}`.

### Logs pruefen

```bash
docker logs mybaby-test | head -20
```

Erwartung:
- [ ] Logs im JSON-Format (structlog)
- [ ] Startup-Meldung sichtbar
- [ ] Kein Traceback oder Error-Level-Eintrag
- [ ] Felder: `event`, `level`, `timestamp`

Beispiel einer korrekten Log-Zeile:

```json
{"event": "Application startup", "level": "info", "timestamp": "2026-04-19T18:00:00Z"}
```

### Container aufraeumen

```bash
docker stop mybaby-test && docker rm mybaby-test
docker volume rm mybaby-data
```

## 7. Import-Test (Baby Buddy)

### Export aus Baby Buddy

1. Baby Buddy Admin-UI oeffnen
2. Unter "Database" > "Export" die gewuenschten Daten als JSON exportieren
3. Oder via API:

```bash
# Alle Schlaf-Eintraege exportieren
http GET baby-buddy-host:8090/api/sleep/ \
  Authorization:"Token <baby-buddy-api-token>" \
  > export_sleep.json

# Alle Fuetterungen exportieren
http GET baby-buddy-host:8090/api/feedings/ \
  Authorization:"Token <baby-buddy-api-token>" \
  > export_feeding.json

# Alle Windel-Eintraege exportieren
http GET baby-buddy-host:8090/api/changes/ \
  Authorization:"Token <baby-buddy-api-token>" \
  > export_diaper.json
```

### Import-Script ausfuehren

```bash
cd backend
source .venv/bin/activate

# Import aller Daten
python -m app.cli import \
  --sleep export_sleep.json \
  --feeding export_feeding.json \
  --diaper export_diaper.json
```

Erwartung:
- [ ] Script laeuft ohne Fehler durch
- [ ] Ausgabe zeigt Anzahl importierter Eintraege pro Typ
- [ ] Duplikate werden erkannt und uebersprungen

### Daten in UI verifizieren

- [ ] Dashboard oeffnen -- Widgets zeigen importierte Daten
- [ ] Anzahl der Eintraege pro Plugin stimmt mit Export ueberein
- [ ] Timestamps korrekt konvertiert (Baby Buddy UTC > MyBaby UTC > Anzeige Lokalzeit)
- [ ] Aelteste Eintraege in der Liste sichtbar (Scroll/Pagination pruefen)
- [ ] Stichprobe: 3 zufaellige Eintraege manuell vergleichen (Export vs. UI)
