# Lead Coding Agent — Sprint 18 (Security & Quality Review)

Rolle: Agiere als Lead Coding Agent und bearbeite Sprint 18.
Lies zuerst deine Agenten-Definition: ~/.claude/agents/coding-lead.md

Lies zuerst das SSTD der vorherigen Session: 400 AI Agent/440 Session State Transfer Documents (SSTD)/(SSTD) MyBaby Sprint 19+20 — Bugs, Notes UX, Milestone-Fotos.md

Kontext: MyBaby ist deployed und laeuft produktiv. Sprints 1-20 abgeschlossen (v0.8.0). 14 Plugins aktiv. Auth-System vollstaendig. i18n (de/en). Sprint 19 brachte 5 Bug-Fixes (Sleep-Timer, Datumswechsel, Windel, Cookie) + Notes UX (Suche, Einklappen, Markdown-Preview) + U-Untersuchungen Datumsbereich + Dashboard-Durchschnitte. Sprint 20 brachte Photo-Proxy + Thumbnails (Pillow), Foto-Upload UI, Meilenstein-Timeline, Admin Medienverwaltung.

Sprint-Planung: Sprint 18 existiert in project.db (status=planning). Scrum-Master-Session empfohlen fuer Task-Erstellung.

Aufgabe: Sprint 18 — Security & Quality Review

Korrekte Abfrage: SELECT id, title, priority, status FROM backlog WHERE assigned_sprint=18 ORDER BY priority, id

WICHTIG: Pillow ist neue Dependency (requirements.txt). Beim Container-Build pruefen ob libjpeg/zlib vorhanden.

Moegliche Sprint-18-Items (Scrum-Master entscheidet):
- Pre-existing Test-Failures fixen (TodoForm, AUTH_MODE Isolation)
- Security-Audit: OWASP Top 10, Input-Validation aller Plugins (insbesondere neue Photo-Upload-Endpunkte)
- Code-Quality: Duplikate entfernen, Typisierung vervollstaendigen
- Performance-Review: Bundle-Size, API-Latenz, ZIP-Download bei vielen Fotos
- Test-Coverage erhoehen: Frontend-Tests fuer PhotoSection, MilestonesTimeline, MediaAdminPage, MarkdownEditor
- Dependency-Check: pip-audit + npm audit
- Photo-Security: Auth-Proxy validieren, IDOR-Check auf /api/v1/milestones/photos/{path}

Testing & Deployment:
- Stelle sicher, dass jedes Feature einen eigenen Commit hat
- Teste auf localhost:3000 (Frontend) + localhost:8080 (Backend)
- Proxy-Target in vite.config.ts MUSS http://localhost:8080 sein (NICHT NAS-IP)

Sprint abschliessen:
- SSTD anfertigen (Typ: CODE)
- Sprint ID 18 in project.db auf closed setzen, erledigte Backlog-Items auf done
- CLAUDE.md aktualisieren (Aktueller Stand, Test-Zahlen)
- MEMORY.md aktualisieren
