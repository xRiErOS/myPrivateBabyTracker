# Lead Coding Agent — Sprint 15 (v1.0.0 Go Live)

Rolle: Agiere als Lead Coding Agent und bearbeite Sprint 15 (v1.0.0).
Lies zuerst deine Agenten-Definition: ~/.claude/agents/coding-lead.md

Lies zuerst das SSTD der vorherigen Session: 400 AI Agent/440 Session State Transfer Documents (SSTD)/ — neuestes SSTD mit "Sprint 14" im Titel.

Kontext: MyBaby ist deployed und getestet. Sprints 1-14 (v0.1.0 bis v0.6.2) abgeschlossen. Auth-System vollstaendig. i18n Mehrsprachigkeit (de/en). 387 Backend-Tests + 83 Frontend-Tests.

Sprint-Planung: Sprint 15 muss in project.db angelegt werden (Scrum-Master-Session empfohlen).

Aufgabe: Sprint 15 (v1.0.0) — Go Live Vorbereitung

Korrekte Abfrage: SELECT id, title, priority, status FROM backlog WHERE assigned_sprint=15 ORDER BY priority, id

WICHTIG: Vor Sprint-Start muss die Alembic-Migration vom letzten Sprint ausgefuehrt werden:
```
sudo docker exec mybaby alembic -c /app/alembic.ini upgrade head
```

Migration n5o6p7q8r9s0: Wonder-Weeks-Sprungdaten korrigiert (UPDATE bestehender Eintraege)

Moegliche Go-Live-Items (Scrum-Master entscheidet):
- Pre-existing Test-Failures fixen (notes_max_length, leap_status_preterm, children tests)
- Julia-Feedback: Englische Uebersetzungen reviewen
- Backend Error-Codes auf maschinenlesbare Codes umstellen (i18n-Vorbereitung)
- Performance-Review: Bundle-Size, API-Latenz, Mobile-PWA
- Deployment-Dokumentation finalisieren

Testing & Deployment:
- Stelle sicher, dass jedes Feature einen eigenen Commit hat
- Teste auf localhost:3000 (Frontend) + localhost:8080 (Backend)
- Proxy-Target in vite.config.ts MUSS http://localhost:8080 sein (NICHT NAS-IP)

Sprint abschliessen:
- SSTD anfertigen (Typ: CODE)
- Sprint ID 15 in project.db auf closed setzen, erledigte Backlog-Items auf done
- CLAUDE.md aktualisieren (Aktueller Stand, Test-Zahlen)
- MEMORY.md aktualisieren
