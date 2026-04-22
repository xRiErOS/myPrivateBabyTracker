# MyBaby Home Lab Deployment-Plan — Authelia SSO + Nutzerpraeferenzen

## Kontext

| | Aktuell | Ziel |
|---|---------|------|
| AUTH_MODE | `disabled` | `forward` |
| Domain | `baby.familie-riedel.org` | gleich |
| Port | 8080 → 8000 | gleich |
| Authelia | Regel existiert (Forward Auth + API-Bypass) | Nutzer-Mapping Erik + Julia |
| Container | `mybaby` (healthy, Portainer Git-Deploy) | gleich, Redeploy mit neuen Env-Vars |

**Benutzer-Ziel:**
- Erik (Gruppe `admins`) → MyBaby-Rolle `admin`
- Julia (Gruppe `family`) → MyBaby-Rolle `caregiver`
- Beide authentifizieren sich ueber Authelia SSO (two_factor)
- Beide koennen ihre Praeferenzen in `/admin/auth` einsehen

## Voraussetzungen

- [x] Sprint 12 (v0.6.0) ist implementiert und gepusht
- [x] Container `mybaby` laeuft (Port 8080, healthy)
- [x] Authelia-Regel fuer `baby.familie-riedel.org` existiert (two_factor fuer family + admins, API-Bypass)
- [x] NPM Proxy Host fuer `baby.familie-riedel.org` existiert
- [x] Cloudflare Tunnel Route fuer `baby.familie-riedel.org` existiert

## Plan (7 Schritte)

### Schritt 1: Container neu bauen mit Sprint 12

Der Container muss das neue Auth-System (JWT, TOTP, WebAuthn, Auth-Router) enthalten.

**In Portainer:**
1. Stack `mybaby` oeffnen
2. **Pull and Redeploy** klicken (oder Git-Deploy aktualisieren)
3. Warten bis Container `healthy`

**Verifikation:**
```bash
ssh -p 2917 adminErik@192.168.178.185 'sudo docker exec mybaby python3 -c "from app.api.auth import router; print(\"Auth Router OK\")"'
```

### Schritt 2: Alembic-Migration ausfuehren

Sprint 12 hat 2 neue Migrationen (totp_secrets, webauthn_credentials):

```bash
ssh -p 2917 adminErik@192.168.178.185 'sudo docker exec mybaby alembic -c /app/alembic.ini upgrade head'
```

**Erwarteter Output:**
```
INFO  [alembic.runtime.migration] Running upgrade g8h9i0j1k2l3 -> h9i0j1k2l3m4, Add TOTP 2FA tables
INFO  [alembic.runtime.migration] Running upgrade h9i0j1k2l3m4 -> i0j1k2l3m4n5, Add WebAuthn credentials table
```

**Verifikation:**
```bash
ssh -p 2917 adminErik@192.168.178.185 'sudo docker exec mybaby alembic -c /app/alembic.ini current'
# → i0j1k2l3m4n5 (head)
```

### Schritt 3: AUTH_MODE auf `forward` umstellen

**In Portainer:**
1. Stack `mybaby` oeffnen → Environment Variables
2. Aendern:

| Variable | Alt | Neu |
|----------|-----|-----|
| `AUTH_MODE` | `disabled` | `forward` |
| `AUTH_TRUSTED_PROXIES` | `192.168.178.0/24` | `192.168.178.0/24,172.16.0.0/12` |

**Warum `172.16.0.0/12`?** NPM und MyBaby sind im selben Docker-Netzwerk (`nginx-proxy_default`). Requests von NPM kommen mit einer Docker-internen IP (172.x.x.x), nicht mit der Host-IP. Der CIDR `172.16.0.0/12` deckt alle Docker-Bridge-Netzwerke ab.

3. **Redeploy** klicken

**Verifikation:**
```bash
ssh -p 2917 adminErik@192.168.178.185 'sudo docker exec mybaby env | grep AUTH_MODE'
# → AUTH_MODE=forward
```

### Schritt 4: NPM Proxy Host pruefen

Der NPM Proxy Host fuer `baby.familie-riedel.org` muss Forward-Auth-Header an MyBaby weiterleiten.

**In NPM (https://[tailscale-ip]:81):**
1. Proxy Host `baby.familie-riedel.org` oeffnen
2. Tab **Advanced** → Custom Nginx Configuration pruefen

**Erforderliche Konfiguration** (Forward Auth mit Authelia):

```nginx
# Authelia Forward Auth
location /authelia {
    internal;
    set $upstream_authelia http://192.168.178.185:9091/api/authz/forward-auth;
    proxy_pass $upstream_authelia;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URL $scheme://$http_host$request_uri;
    proxy_set_header X-Forwarded-Method $request_method;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-Forwarded-URI $request_uri;
    proxy_set_header X-Forwarded-For $remote_addr;
}

# API-Bypass (fuer API-Key-Auth, Mobile Apps)
location /api/ {
    proxy_pass http://192.168.178.185:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Alle anderen Requests: Forward Auth + Header
location / {
    auth_request /authelia;
    auth_request_set $user $upstream_http_remote_user;
    auth_request_set $groups $upstream_http_remote_groups;
    auth_request_set $name $upstream_http_remote_name;
    auth_request_set $email $upstream_http_remote_email;

    proxy_pass http://192.168.178.185:8080;
    proxy_set_header Host $host;
    proxy_set_header Remote-User $user;
    proxy_set_header Remote-Groups $groups;
    proxy_set_header Remote-Name $name;
    proxy_set_header Remote-Email $email;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Wichtig:** Die Authelia-Regel fuer `baby.familie-riedel.org` existiert bereits:
- `/api/*` → `bypass` (API-Key-Auth fuer Machine-to-Machine)
- Alles andere → `two_factor` fuer `group:family` und `group:admins`

### Schritt 5: Authelia-Konfiguration verifizieren

Die bestehende Authelia-Config ist bereits korrekt. Zur Sicherheit pruefen:

```bash
ssh -p 2917 adminErik@192.168.178.185 'grep -B2 -A5 "baby" /volume2/docker/authelia/configuration.yml'
```

**Erwartete Regeln:**
```yaml
# API-Bypass (muss VOR der domain-Regel stehen)
- domain: baby.familie-riedel.org
  resources:
    - "^/api(/.*)?$"
  policy: bypass

# Web-UI: two_factor fuer family
- domain:
    - ...
    - baby.familie-riedel.org
  subject: "group:family"
  policy: two_factor
```

**Keine Aenderungen an der Authelia-Config noetig.**

### Schritt 6: End-to-End testen

#### Test 1: Auth-Status (direkt, ohne Proxy)

```bash
ssh -p 2917 adminErik@192.168.178.185 'sudo docker exec mybaby curl -s http://localhost:8000/api/v1/auth/status'
```

Erwartet:
```json
{"auth_mode":"forward","authenticated":false,"user":null}
```

#### Test 2: Forward-Auth mit Header (simuliert NPM)

```bash
ssh -p 2917 adminErik@192.168.178.185 'sudo docker exec mybaby curl -s -H "Remote-User: erik" -H "Remote-Groups: admins" -H "Remote-Name: Erik" http://localhost:8000/api/v1/auth/status'
```

Erwartet:
```json
{"auth_mode":"forward","authenticated":true,"user":{"username":"erik","role":"admin","auth_type":"forward_auth",...}}
```

#### Test 3: Julia-Login

```bash
ssh -p 2917 adminErik@192.168.178.185 'sudo docker exec mybaby curl -s -H "Remote-User: julia" -H "Remote-Groups: family" -H "Remote-Name: Julia" http://localhost:8000/api/v1/auth/status'
```

Erwartet:
```json
{"auth_mode":"forward","authenticated":true,"user":{"username":"julia","role":"caregiver",...}}
```

**Hinweis:** Die Tests innerhalb des Containers umgehen die HeaderStrippingMiddleware (localhost ist nicht in trusted_proxies). Wenn die Middleware localhost blockiert, muss der Test ueber den NPM-Proxy erfolgen.

#### Test 4: Browser-Test (ueber Authelia)

1. `https://baby.familie-riedel.org` im Browser oeffnen
2. Authelia zeigt Login-Seite → mit Erik einloggen (2FA)
3. MyBaby Dashboard wird angezeigt
4. `/admin/auth` oeffnen → "Angemeldet als erik, Rolle: admin" pruefen

5. Im Incognito-Fenster: Mit Julia einloggen
6. Dashboard wird angezeigt
7. `/admin/auth` oeffnen → "Angemeldet als julia, Rolle: caregiver" pruefen

### Schritt 7: Nutzerpraeferenzen einrichten

Nach dem ersten Login ueber Authelia werden Erik und Julia automatisch als Benutzer angelegt (Auto-Provisioning). Danach koennen sie in `/admin/auth`:

**Erik (admin):**
- Auth-Modus einsehen (Forward-Auth / SSO)
- Optional: 2FA TOTP zusaetzlich zu Authelia einrichten
- Optional: Passkey registrieren (als Fallback bei `AUTH_MODE=both`)
- Benutzerinformationen einsehen

**Julia (caregiver):**
- Auth-Modus einsehen
- Benutzerinformationen einsehen

**Stillmodus konfigurieren** (Dashboard-Praeferenz):
- Verwaltung → Stillmodus Toggle (bereits vorhanden, localStorage-basiert)

**Quick Actions konfigurieren** (Dashboard-Schnellzugriffe):
- Verwaltung → Quick Actions (3 Favoriten, localStorage-basiert)

## Zusammenfassung der Aenderungen

| Komponente | Aenderung | Durch wen |
|------------|-----------|-----------|
| Portainer | AUTH_MODE=forward, AUTH_TRUSTED_PROXIES erweitert | Erik (Portainer UI) |
| Container | Redeploy mit Sprint 12 Code | Erik (Portainer UI) |
| Alembic | 2 Migrationen ausfuehren | Erik (SSH) |
| NPM | Proxy Host pruefen (Forward-Auth Headers) | Erik (NPM UI) |
| Authelia | **Keine Aenderung** (Regeln existieren bereits) | - |
| Cloudflare | **Keine Aenderung** (Route existiert bereits) | - |

## Risiken und Fallback

| Risiko | Auswirkung | Fallback |
|--------|------------|----------|
| AUTH_TRUSTED_PROXIES falsch | 401 bei allen Requests ueber NPM | Zurueck auf `AUTH_MODE=disabled` |
| NPM Forward-Auth Headers fehlen | Nutzer wird nicht erkannt | NPM Custom Config pruefen |
| Migration schlaegt fehl | Container Restart-Loop | `alembic downgrade -1` oder `AUTH_MODE=disabled` |

**Schneller Rollback:** In Portainer `AUTH_MODE=disabled` setzen und redeployen — sofort wieder funktionsfaehig.

## Reihenfolge (Kurzfassung)

```
1. Portainer: Redeploy (neuer Code)
2. SSH: alembic upgrade head
3. Portainer: AUTH_MODE=forward + TRUSTED_PROXIES erweitern → Redeploy
4. NPM: Forward-Auth Config pruefen
5. Browser: Erik + Julia testen
6. Praeferenzen einrichten
```
