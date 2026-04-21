# User-Testing Sprint 5 (v0.5.1)

## Testumgebung
- URL: baby.familie-riedel.org
- Version: v0.5.1
- Geraet: iPhone 14 Pro / Desktop Browser

## Testfaelle

### T1 — Plugin-Management
- [ ] /admin/plugins erreichbar
- [ ] Basis-Plugins (Schlaf, Mahlzeiten, Windeln) nicht deaktivierbar (Toggle disabled)
- [ ] Optionales Plugin deaktivieren (z.B. Temperatur)
- [ ] Deaktiviertes Plugin verschwindet aus BottomNav
- [ ] Deaktiviertes Plugin verschwindet aus Sidebar (Desktop)
- [ ] Deaktiviertes Plugin verschwindet aus Dashboard Widget-Grid
- [ ] Deaktiviertes Plugin verschwindet aus Add-Menu
- [ ] Plugin wieder aktivieren — erscheint sofort wieder
- [ ] VitD3 deaktivieren — VitD3-Tile in BabySummary verschwindet

### T2 — API-Key-Authentifizierung
- [ ] /admin/api-keys erreichbar
- [ ] Neuen API-Key erstellen (Name + Scopes)
- [ ] Key wird einmalig angezeigt mit Copy-Button
- [ ] Key verschwindet nach Schliessen des Dialogs
- [ ] Key-Liste zeigt Prefix, Scopes, Status
- [ ] Key deaktivieren (Toggle)
- [ ] Key loeschen (mit Bestaetigung)
- [ ] API-Call mit Key: `curl -H "X-API-Key: <key>" https://baby.familie-riedel.org/api/v1/api-keys/`

### T3 — Health-Plugin (Spucken + Bauchschmerzen)
- [ ] /health erreichbar
- [ ] Spucken eintragen: Typ "Spucken" + Intensitaet (Wenig/Mittel/Stark)
- [ ] Bauchschmerzen eintragen: Typ "Bauchschmerzen" + Intensitaet + Dauer
- [ ] Dauer-Feld nur bei Bauchschmerzen sichtbar
- [ ] Liste zeigt Eintraege mit Farbcodierung (gruen/peach/rot)
- [ ] Inline-Edit funktioniert
- [ ] Health-Widget im Dashboard sichtbar
- [ ] Klick auf Widget navigiert zu /health

### T4 — Tummy Time Plugin (Bauchlage)
- [ ] /tummy-time erreichbar
- [ ] "Jetzt starten" startet Timer
- [ ] Laufender Timer wird mit Echtzeit-Counter angezeigt
- [ ] "Stopp" beendet Session
- [ ] Abgeschlossene Session erscheint in Liste
- [ ] Laufende Session NICHT in Liste
- [ ] Manuelles Nachtragen funktioniert
- [ ] TummyTime-Widget im Dashboard sichtbar
- [ ] Widget zeigt heutige Gesamtdauer

### T5 — Windeln-Widget Balken
- [ ] Windeln-Tile "Windeln heute" zeigt farbige Balken unter den Kacheln
- [ ] Balken-Farben korrekt: blau (nass), orange (dreckig), lila (beides)
- [ ] Balken-Breite proportional zur Anzahl
- [ ] Ohne Windeln heute: kein Balken sichtbar

### T6 — Verwaltungs-Hub
- [ ] Plugins-Kachel sichtbar in /admin
- [ ] API-Keys-Kachel sichtbar in /admin
- [ ] Alle bestehenden Kacheln weiterhin vorhanden

## Notizen
