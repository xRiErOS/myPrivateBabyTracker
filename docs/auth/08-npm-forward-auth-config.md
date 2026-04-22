# NPM Forward Auth Konfiguration fuer MyBaby

Schritt-fuer-Schritt-Anleitung zur Konfiguration des NGINX Proxy Manager (NPM) Proxy Hosts fuer MyBaby mit Authelia Forward Auth.

## Voraussetzungen

- NPM laeuft und ist erreichbar (Port 81 via Tailscale)
- Authelia laeuft auf `192.168.178.185:9091`
- MyBaby Container laeuft auf `192.168.178.185:8080`
- Authelia access_control Regeln fuer `baby.familie-riedel.org` existieren

## Anleitung

### 1. NPM Admin oeffnen

Im Browser: `https://[tailscale-ip]:81` → Login

### 2. Proxy Host anlegen oder bearbeiten

Falls `baby.familie-riedel.org` bereits existiert (von Baby Buddy): bearbeiten.
Falls neu: **Add Proxy Host** klicken.

### 3. Tab "Details"

| Feld | Wert |
|------|------|
| Domain Names | `baby.familie-riedel.org` |
| Scheme | `http` |
| Forward Hostname / IP | `192.168.178.185` |
| Forward Port | `8080` |
| Block Common Exploits | An |
| Websockets Support | Aus (nicht benoetigt) |

### 4. Tab "SSL"

| Feld | Wert |
|------|------|
| SSL Certificate | `*.familie-riedel.org` (Wildcard) |
| Force SSL | An |
| HTTP/2 Support | An |

### 5. Tab "Advanced" — Custom Nginx Configuration

Den folgenden Block **vollstaendig** in das Textfeld einfuegen:

```nginx
# ============================================================
# MyBaby Forward Auth mit Authelia
# ============================================================

# --- Authelia Auth-Request Endpoint ---
location /internal/authelia/authz {
    internal;
    proxy_pass http://192.168.178.185:9091/api/authz/auth-request;
    proxy_set_header X-Original-Method $request_method;
    proxy_set_header X-Original-URL https://$http_host$request_uri;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header Content-Length "";
    proxy_set_header Connection "";
    proxy_pass_request_body off;
}

# --- API Bypass (kein Forward Auth) ---
# API-Requests nutzen API-Key-Auth oder werden durch
# Authelia access_control bypass-Regel durchgelassen.
location /api/ {
    proxy_pass http://192.168.178.185:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}

# --- Web-UI (Forward Auth + User-Header) ---
location / {
    # Authelia Forward Auth
    auth_request /internal/authelia/authz;

    # User-Info Headers von Authelia uebernehmen
    auth_request_set $user $upstream_http_remote_user;
    auth_request_set $groups $upstream_http_remote_groups;
    auth_request_set $name $upstream_http_remote_name;
    auth_request_set $email $upstream_http_remote_email;

    # Headers an MyBaby weiterleiten
    proxy_set_header Remote-User $user;
    proxy_set_header Remote-Groups $groups;
    proxy_set_header Remote-Email $email;
    proxy_set_header Remote-Name $name;

    # Bei 401 (nicht authentifiziert) → Redirect zu Authelia Login
    auth_request_set $redirection_url $upstream_http_location;
    error_page 401 =302 $redirection_url;

    # Proxy zu MyBaby
    proxy_pass http://192.168.178.185:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
```

### 6. Speichern

**Save** klicken. NPM uebernimmt die Konfiguration sofort.

## Kritische Hinweise

| Punkt | Erklaerung |
|-------|-----------|
| `https://` in X-Original-URL | **NICHT** `$scheme` verwenden. NPM lauscht intern auf Port 80 → `$scheme` waere `http` → Authelia gibt 400 zurueck |
| `192.168.178.185:9091` | NAS-IP verwenden, **NICHT** Container-Name `authelia`. Authelia laeuft in eigenem Docker-Netzwerk (`authelia_default`) |
| `/api/` ohne auth_request | API-Requests brauchen keinen Forward Auth — sie nutzen API-Key-Auth oder werden durch die Authelia bypass-Regel durchgelassen |
| `proxy_pass_request_body off` | Pflicht im Authelia-Block — ohne wird der Request-Body an Authelia gesendet, was zu Fehlern fuehrt |
| `error_page 401 =302` | Leitet nicht-authentifizierte Requests zur Authelia Login-Seite weiter |

## Verifikation

### Test 1: Extern (Browser)

1. `https://baby.familie-riedel.org` oeffnen
2. Authelia Login-Seite erscheint → mit Erik/Julia anmelden (2FA)
3. MyBaby Dashboard wird angezeigt

### Test 2: API Bypass

```bash
curl -s https://baby.familie-riedel.org/api/v1/health
# → {"status":"healthy"} (kein Authelia-Redirect)
```

### Test 3: Header-Pruefung im Container

```bash
ssh -p 2917 adminErik@192.168.178.185 'sudo docker logs --tail 50 mybaby | grep user_auto_created'
# → Zeigt Auto-Provisioning-Events fuer neue User
```

## Unterschied zu Baby Buddy

| Aspekt | Baby Buddy | MyBaby |
|--------|-----------|--------|
| Auth-Logik | Interner nginx setzt `Remote-User: admin` hardcoded | MyBaby liest Remote-User direkt von NPM |
| API-Auth | Token-Auth (`Authorization: Token ...`) | API-Key-Auth (Argon2 Hash, Scopes) |
| Forward Auth | NPM → Baby Buddy nginx → Gunicorn | NPM → MyBaby direkt (kein interner nginx) |
| User-Mapping | Immer "admin" (kein echtes Mapping) | Auto-Provisioning mit Rollen aus Remote-Groups |
| CSRF | Django CSRF | starlette-csrf Double-Submit-Cookie |

## Haeufige Fehler

| Symptom | Ursache | Loesung |
|---------|---------|---------|
| 400 von Authelia | `$scheme` statt `https://` in X-Original-URL | `https://` hardcoded verwenden |
| 502 Bad Gateway | MyBaby Container nicht gestartet oder falscher Port | `sudo docker ps --filter name=mybaby` pruefen |
| 502 `authelia could not be resolved` | Container-Name statt NAS-IP | `192.168.178.185:9091` verwenden |
| Authelia Login erscheint nicht | Authelia access_control Regel fehlt | `/volume2/docker/authelia/configuration.yml` pruefen |
| API gibt 401 statt Daten | `/api/` Location fehlt im Advanced-Block | API-Bypass Location hinzufuegen |
| User wird nicht erkannt (401 in MyBaby) | AUTH_TRUSTED_PROXIES enthaelt nicht die NPM-IP | `172.16.0.0/12` hinzufuegen |
| Redirect-Loop | SSL-Config falsch oder Force SSL fehlt | SSL-Tab in NPM pruefen |
