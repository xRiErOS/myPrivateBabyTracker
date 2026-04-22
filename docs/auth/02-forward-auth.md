# AUTH_MODE=forward — SSO mit Authelia (Forward-Auth)

## Wann verwenden

- MyBaby laeuft hinter Nginx Proxy Manager (NPM) mit Authelia als Forward-Auth-Provider
- Single Sign-On (SSO) gewuenscht — Benutzer authentifizieren sich einmalig bei Authelia
- Typisches Home-Lab-Setup: NPM → Authelia → MyBaby

## Architektur

```
Browser → NPM (baby.familie-riedel.org)
           │
           ├─ Forward-Auth: Authelia (auth.familie-riedel.org)
           │   └─ Prueft Session/2FA
           │   └─ Setzt Header: Remote-User, Remote-Groups, Remote-Name, Remote-Email
           │
           └─ Proxy Pass: MyBaby (192.168.178.185:8080)
               └─ HeaderStrippingMiddleware (K1)
                   └─ Prueft: Kommt Request von vertrauenswuerdigem Proxy?
                       ├─ Ja → Header werden akzeptiert → User wird angelegt/gemappt
                       └─ Nein → Header werden entfernt → 401 Unauthorized
```

## Einrichtung

### 1. Umgebungsvariablen setzen

```env
AUTH_MODE=forward
AUTH_TRUSTED_HEADER=Remote-User
AUTH_TRUSTED_PROXIES=192.168.178.0/24
SECRET_KEY=dein-geheimer-schluessel-mindestens-32-zeichen
ENVIRONMENT=prod
```

| Variable | Erklaerung |
|----------|-----------|
| `AUTH_TRUSTED_HEADER` | Header-Name, den Authelia setzt (Standard: `Remote-User`) |
| `AUTH_TRUSTED_PROXIES` | CIDR-Bereich des Reverse Proxy. Nur diese IPs duerfen Auth-Header setzen |

### 2. Authelia konfigurieren

In der Authelia `configuration.yml` muss die MyBaby-Domain als geschuetzte Ressource eingetragen sein:

```yaml
access_control:
  default_policy: deny
  rules:
    - domain: baby.familie-riedel.org
      policy: two_factor
```

### 3. NPM (Nginx Proxy Manager) konfigurieren

Proxy Host fuer `baby.familie-riedel.org`:

- **Scheme**: http
- **Forward Hostname/IP**: 192.168.178.185 (NAS IP)
- **Forward Port**: 8080
- **Custom Nginx Configuration** (Advanced Tab):

```nginx
# Forward-Auth mit Authelia
location /authelia {
    internal;
    set $upstream_authelia http://authelia:9091/api/verify;
    proxy_pass $upstream_authelia;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URL $scheme://$http_host$request_uri;
}

auth_request /authelia;
auth_request_set $user $upstream_http_remote_user;
auth_request_set $groups $upstream_http_remote_groups;
auth_request_set $name $upstream_http_remote_name;
auth_request_set $email $upstream_http_remote_email;

proxy_set_header Remote-User $user;
proxy_set_header Remote-Groups $groups;
proxy_set_header Remote-Name $name;
proxy_set_header Remote-Email $email;
```

### 4. AUTH_TRUSTED_PROXIES korrekt setzen

Der CIDR-Bereich muss die IP-Adresse enthalten, von der NPM Requests an MyBaby weiterleitet:

```bash
# IP des Reverse Proxy pruefen (innerhalb des Docker-Netzwerks)
docker exec mybaby env | grep AUTH_TRUSTED_PROXIES

# Typische Werte:
# Lokales Netzwerk: 192.168.178.0/24
# Docker Bridge: 172.17.0.0/16
# Docker Compose Netzwerk: 172.18.0.0/16
```

**Wichtig**: Wenn NPM und MyBaby im selben Docker-Netzwerk sind, muss die Docker-interne IP verwendet werden, nicht die Host-IP.

### 5. Verifizieren

```bash
# Direkt (ohne Proxy) — sollte 401 geben:
curl http://localhost:8080/api/v1/auth/status
# → {"auth_mode":"forward","authenticated":false,"user":null}

# Mit Forward-Auth Header von vertrauenswuerdigem Proxy:
curl -H "Remote-User: erik" http://localhost:8080/api/v1/auth/status
# → Wenn von trusted IP: {"authenticated":true,"user":{"username":"erik",...}}
# → Wenn von untrusted IP: Header wird gestripped → 401
```

## Auto-Provisioning

Bei der ersten Anfrage mit einem neuen `Remote-User`-Wert wird automatisch ein Benutzer angelegt:

| Header | Feld im User-Model | Default |
|--------|--------------------|---------|
| `Remote-User` | `username` | (Pflicht) |
| `Remote-Name` | `display_name` | Username |
| `Remote-Groups` | `role` | `caregiver` (bei "admin" in Groups → `admin`) |

**Beispiel**: Authelia sendet `Remote-User: julia`, `Remote-Groups: users` → MyBaby erstellt User `julia` mit Rolle `caregiver`.

## Rollen-Mapping

| Remote-Groups Header | Resultierende Rolle |
|---------------------|-------------------|
| Enthaelt "admin" (z.B. `admin,users`) | `admin` |
| Alles andere (z.B. `users`) | `caregiver` |
| Nicht gesetzt | `caregiver` |

## Header-Stripping (Sicherheit K1)

Die `HeaderStrippingMiddleware` ist die aeusserste Middleware und entfernt folgende Header von nicht-vertrauenswuerdigen IPs:

- `remote-user`
- `remote-groups`
- `remote-name`
- `remote-email`
- `x-forwarded-user`
- `x-forwarded-groups`

Versucht ein Client ausserhalb von `AUTH_TRUSTED_PROXIES`, diese Header zu senden, werden sie entfernt und ein Warning geloggt:

```
header_spoofing_attempt  client_ip=203.0.113.5  header=remote-user
```

## Frontend-Verhalten

```
GET /api/v1/auth/status → auth_mode="forward", authenticated=true, user={...}
  → AuthGuard: authMode === "forward" → Render App (kein Login-Formular)
```

Das Frontend zeigt keine Login-Seite an. Die Authentifizierung erfolgt transparent ueber Authelia.

## Troubleshooting

| Problem | Ursache | Loesung |
|---------|---------|---------|
| 401 trotz Authelia-Login | `AUTH_TRUSTED_PROXIES` enthaelt nicht die Proxy-IP | CIDR-Bereich pruefen, Docker-Netzwerk-IP verwenden |
| `header_spoofing_attempt` in Logs | Request kommt von IP ausserhalb trusted range | Proxy-IP in `AUTH_TRUSTED_PROXIES` aufnehmen |
| User hat falsche Rolle | `Remote-Groups` Header wird nicht korrekt gesetzt | Authelia-Konfiguration pruefen, Groups-Mapping |
| User wird nicht erstellt | Header-Name stimmt nicht mit `AUTH_TRUSTED_HEADER` ueberein | `AUTH_TRUSTED_HEADER` auf den korrekten Header-Namen setzen |
