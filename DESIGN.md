# Baby Dashboard — Design System

> Status-Quo-Dokumentation des Baby-Tracking-Dashboards auf Basis von Baby Buddy.
> Zielgruppe: KI-Agenten und Entwickler, die das Projekt eigenstaendig weiterentwickeln.
> Primaerer Nutzungskontext: Eltern tracken mit dem Smartphone — Mobile First ist kein Feature, sondern die Grundvoraussetzung.

## 1. Design-Philosophie

### Leitbild: "Ruhige Praezision"

Das Dashboard ist ein Werkzeug fuer muede Eltern. Jede Designentscheidung folgt drei Prinzipien:

1. **Ein-Hand-Bedienung** — Alle primaeren Aktionen muessen mit dem Daumen erreichbar sein
2. **Null Kognitive Last** — Presets statt Texteingabe, visuelle Hierarchie statt Beschriftung
3. **Sanfte Aesthetik** — Catppuccin-Farbpalette mit tonaler Tiefe statt harter Kontraste

### Design-Regeln (Inherited)

| Regel | Umsetzung |
|-------|-----------|
| Keine 1px-Borders | Tiefe entsteht durch Surface-Farbstufen, nicht durch Linien |
| Keine Drop-Shadows | Tonale Schichtung (surface0 → surface1 → surface2) |
| Grosse Rundungen | `border-radius: 1rem` (`rounded-card`) fuer alle Container |
| Kein visueller Muell | Nur das Noetigste anzeigen, Whitespace ist ein Feature |

## 2. Farbsystem

### Catppuccin Dual-Theme

Das Farbsystem basiert auf [Catppuccin](https://catppuccin.com/) und wechselt automatisch per `prefers-color-scheme`.

#### Grundfarben

| Token | Latte (Light) | Macchiato (Dark) | Verwendung |
|-------|---------------|------------------|------------|
| `base` | `#eff1f5` | `#24273a` | Seitenhintergrund |
| `surface0` | `#ccd0da` | `#363a4f` | Karten, Formular-Container |
| `surface1` | `#bcc0cc` | `#494d64` | Inaktive Buttons, Hover-States |
| `surface2` | `#acb0be` | `#5b6078` | Hover auf surface1-Elementen |
| `overlay0` | `#9ca0b0` | `#6e738d` | Overlay-Hintergruende |
| `text` | `#4c4f69` | `#cad3f5` | Primaerer Text |
| `subtext0` | `#6c6f85` | `#a5adcb` | Sekundaerer Text, Labels |
| `subtext1` | `#5c5f77` | `#b8c0e0` | Tertiaerer Text |

#### Semantische Akzentfarben

| Token | Latte | Macchiato | Rolle |
|-------|-------|-----------|-------|
| `peach` | `#fe640b` | `#f5a97f` | **Primaer-Akzent**: Aktiver Tab, Speichern-Button, Zeitauswahl |
| `sapphire` | `#209fb5` | `#7dc4e4` | **Sekundaer-Akzent**: Ausgewaehlte Presets, Links, Baby Buddy Link |
| `green` | `#40a02b` | `#a6da95` | **Erfolg/Positiv**: Vitamin D3 gegeben, Trend-aufwaerts, aktiver Schlaf-Timer |
| `red` | `#d20f39` | `#ed8796` | **Warnung kritisch**: Loeschen-Aktionen, medizinische Warnungen |
| `yellow` | `#df8e1d` | `#eed49f` | **Warnung moderat**: Wenige nasse Windeln, lange Flaschenpause |
| `mauve` | `#8839ef` | `#c6a0f6` | **User-Tab-Akzent** (Home Dashboard, nicht im Baby-Tab) |

#### Farblogik — Wann welche Farbe?

```
Interaktiv (aktiv/selektiert)  → peach (Tabs, Speichern, Zeitwahl)
Interaktiv (Datenauswahl)      → sapphire (Presets, Links)
Positiver Zustand              → green (Gegeben, Trend up, Timer laeuft)
Destruktive Aktion             → red (Loeschen, Alle loeschen)
Warnung (medizinisch)          → red + bg-red/20 (< 6 nasse Windeln, entfaerbter Stuhl)
Warnung (Aufmerksamkeit)       → yellow + bg-yellow/20 (> 4h seit Flasche, trockene Windel)
Trend-Vergleich                → green (>=) / red (<) gegenueber Vortag
Heutiger Tag in Pattern-View   → peach (Hervorhebung)
Inaktiver Zustand              → surface1 / subtext0
```

#### CSS-Variablen (vollstaendig)

```css
:root {
  /* Catppuccin Latte (Light) */
  --color-base: #eff1f5;
  --color-surface0: #ccd0da;
  --color-surface1: #bcc0cc;
  --color-surface2: #acb0be;
  --color-overlay0: #9ca0b0;
  --color-text: #4c4f69;
  --color-subtext0: #6c6f85;
  --color-subtext1: #5c5f77;
  --color-mauve: #8839ef;
  --color-sapphire: #209fb5;
  --color-green: #40a02b;
  --color-yellow: #df8e1d;
  --color-peach: #fe640b;
  --color-red: #d20f39;
  --color-maroon: #e64553;
  --color-pink: #ea76cb;
  --color-lavender: #7287fd;
  --color-blue: #1e66f5;
  --color-sky: #04a5e5;
  --color-teal: #179299;
  --color-flamingo: #dd7878;
  --color-rosewater: #dc8a78;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-base: #24273a;
    --color-surface0: #363a4f;
    --color-surface1: #494d64;
    --color-surface2: #5b6078;
    --color-overlay0: #6e738d;
    --color-text: #cad3f5;
    --color-subtext0: #a5adcb;
    --color-subtext1: #b8c0e0;
    --color-mauve: #c6a0f6;
    --color-sapphire: #7dc4e4;
    --color-green: #a6da95;
    --color-yellow: #eed49f;
    --color-peach: #f5a97f;
    --color-red: #ed8796;
    --color-maroon: #ee99a0;
    --color-pink: #f5bde6;
    --color-lavender: #b7bdf8;
    --color-blue: #8aadf4;
    --color-sky: #91d7e3;
    --color-teal: #8bd5ca;
    --color-flamingo: #f0c6c6;
    --color-rosewater: #f4dbd6;
  }
}
```

## 3. Typografie

### Font-Stack

| Rolle | Font | Gewicht | Verwendung |
|-------|------|---------|------------|
| `font-headline` | Space Grotesk | 600 (semibold) | Seitentitel ("Anna — Heute"), Section-Headlines |
| `font-body` | Manrope | 400, 500 | Fliesstext, Eingabefelder, Timeline-Eintraege |
| `font-label` | Inter Tight | 500 (medium) | Tile-Labels, Button-Text, Formular-Ueberschriften, Warnungen |

### Typografie-Hierarchie

| Element | Klassen | Groesse | Kontext |
|---------|---------|---------|---------|
| Seitentitel | `font-headline text-xl font-semibold tracking-tight` | 1.25rem | "Anna — Heute" |
| Karten-Label | `font-label font-semibold text-sm` | 0.875rem | "Flasche", "Windel", "Schlaf" |
| Tile-Label | `text-[11px] uppercase tracking-wider font-label` | 11px | "LETZTE FLASCHE", "HEUTE GESAMT" |
| Tile-Wert | `text-base font-semibold` | 1rem | "120 ml", "3" |
| Tile-Sub | `text-[12px] text-subtext0` | 12px | "vor 2h", "Gestern: 580 ml" |
| Warnung | `text-[12px] font-label` | 12px | Medizinische Hinweise |
| Timeline-Zeit | `text-[11px] font-label` | 11px | "14:30" |
| Timeline-Text | `text-sm` | 0.875rem | "120 ml Flasche" |

### Schrift-Laden

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600&family=Manrope:wght@400;500&family=Inter+Tight:wght@500&display=swap');
```

## 4. Layout & Spacing

### Mobile-First-Grundsatz

Das Dashboard ist primaer fuer Smartphone-Nutzung (320px–430px) konzipiert. Desktop-Anpassungen sind sekundaer.

```
Viewport:      width=device-width, initial-scale=1.0
Container:     max-w-4xl mx-auto px-4
iOS-Minimum:   16px Schriftgroesse fuer Inputs (verhindert Auto-Zoom)
```

### Spacing-System

| Token | Wert | Verwendung |
|-------|------|------------|
| `gap-1.5` | 6px | Button-Gruppen (Presets) |
| `gap-2` | 8px | Inline-Elemente, Icon + Text |
| `gap-3` | 12px | Tile-Grid, DayCards |
| `mb-2` | 8px | Zwischen Formular-Sektionen |
| `mb-3` | 12px | Label zu Content |
| `mb-4` | 16px | Seitentitel zu Content |
| `mb-6` | 24px | Tab-Bar zu Hauptinhalt |
| `p-3` | 12px | Tile-Innenabstand |
| `p-4` | 16px | Karten/Formulare Innenabstand |

### Grid-System

```
Summary Tiles:    grid grid-cols-2 gap-3         (2 Spalten, immer)
                  grid grid-cols-2 sm:grid-cols-4 (4 Spalten ab 640px fuer erweiterte Tiles)
Preset-Buttons:   flex gap-1.5 flex-wrap          (fliessend, umbrechen bei Platzmangel)
Tab-Bar:          flex gap-0                      (drei gleichbreite Buttons, nahtlos)
Timeline:         flex flex-col gap-2             (vertikale Liste)
D3-Kalender:      grid grid-cols-7 gap-1          (Wochenraster)
Pattern-View:     flex items-start gap-2          (Label links, MiniTimeline rechts)
```

### Responsive Breakpoints

| Breakpoint | Anpassung |
|------------|-----------|
| < 640px (Default) | Einspaltiges Layout, alle Elemente gestapelt |
| >= 640px (`sm:`) | Summary-Tiles 4-spaltig, breitere Buttons |
| Max-Breite | `max-w-4xl` (896px) fuer Desktop-Lesbarkeit |

## 5. Komponenten-Bibliothek

### 5.1 Tab-Bar (Ansichtswechsel)

Drei gleichbreite Buttons ohne Luecke. Der aktive Tab nutzt `peach` als Hintergrund.

```
Struktur:     flex gap-0
Button:       flex-1 py-2.5 text-sm font-label font-medium transition-all
Aktiv:        bg-peach text-ground
Inaktiv:      bg-surface0 text-subtext0 hover:text-text
Rundung:      Links: rounded-l-card / Rechts: rounded-r-card / Mitte: keine
```

**Tabs:** Heute | 7 Tage | 14 Tage

### 5.2 Summary Tiles

Kompakte Informationskacheln mit klarer Hierarchie: Label oben (uppercase, 11px), Wert gross (16px, semibold), Sub-Info klein (12px).

```
Container:    bg-surface0 rounded-card p-3
Klickbar:     cursor-pointer active:bg-surface1 transition-colors
Label:        text-[11px] uppercase tracking-wider text-subtext0 font-label mb-1
Wert:         text-base font-semibold {color} mt-1
Sub-Wert:     text-[12px] text-subtext0 mt-0.5
```

**Aktuelle Tiles:**

| Tile | Wert-Beispiel | Sub-Info | Klick-Aktion |
|------|---------------|----------|--------------|
| Letzte Flasche | `120 ml` | `vor 2h` | Oeffnet Feeding-Liste |
| Heute gesamt | `580 ml ↑` | `Gestern: 520 ml` | Oeffnet Feeding-Liste |
| Letzte Windel | `Nass` | `vor 1h` | Oeffnet Changes-Liste |
| Windeln heute | `6` | `4× nass, 2× beides` | Oeffnet Changes-Liste |
| Schlaf | `● 45 Min.` | `Nap laeuft` | Oeffnet Sleep-Liste |
| Gewicht | `4850 g` | `+120 g` | Oeffnet Weight-Liste |
| Temperatur | `36.8 °C` | `vor 3h` | Oeffnet Temp-Liste |
| Vitamin D3 | `✓` / `—` | — | Oeffnet D3-Kalender |

### 5.3 Warnungen

Farbcodierte Inline-Warnungen oberhalb der Summary Tiles.

```
Container:    px-3 py-2 rounded-card text-[12px] font-label
Gelb:         bg-yellow/20 text-yellow
Rot:          bg-red/20 text-red
```

**Aktuelle Warn-Regeln:**

| Bedingung | Farbe | Text |
|-----------|-------|------|
| < 6 nasse Windeln in 24h | gelb (< 4: rot) | "Nur X nasse Windeln in 24h — Dehydrierung pruefen" |
| Entfaerbter/heller Stuhl | rot | "Heller/entfaerbter Stuhl — bitte Kinderarzt informieren" |
| > 4h seit letzter Flasche (tagsüber) | gelb | "Letzte Flasche vor Xh — Hunger pruefen" |

### 5.4 Formulare (Tracking-Eingaben)

Alle Formulare folgen demselben Aufbau:

```
Wrapper:      bg-surface0 rounded-card p-4 mb-2 overflow-hidden
Label:        font-label font-semibold text-text mb-3 text-sm
```

#### FeedingForm (Flasche)

```
Presets:      [60] [90] [100] [120] [150] ml
              flex gap-1.5 flex-wrap
              Jeder: px-3 py-2.5 text-sm font-label rounded-card min-w-[3rem]
              Aktiv: bg-sapphire text-ground font-medium
              Inaktiv: bg-surface1 text-text hover:bg-surface2

Custom Input: type=number, step=10
              bg-surface1 rounded-card px-3 py-2.5 text-sm
              focus:ring-2 focus:ring-peach

ml-Label:     text-sm text-subtext0 font-label

Speichern:    w-full py-3 text-sm font-label font-semibold
              bg-peach text-ground rounded-card
              hover:opacity-90 disabled:opacity-40
```

#### DiaperForm (Windel)

```
Typ-Auswahl:  [Trocken] [Nass] [Schmutzig] [Beides]
              flex gap-1.5
              Aktiv: bg-sapphire text-ground
              Warnung (Trocken): bg-yellow/20 text-yellow border-2 border-yellow

Farb-Auswahl: (nur bei Schmutzig/Beides sichtbar)
              [Gelb] [Gruen] [Braun] [Hell/entfaerbt]
              Aktiv: bg-sapphire text-ground
              Warnung (Hell): bg-red/20 text-red border-2 border-red
```

#### SleepForm (Schlaf)

Zwei Modi: Timer-basiert oder manuell.

```
Timer aktiv:  Gruener Punkt (w-2 h-2 bg-green rounded-full) + "Seit X Min."
              Start-Zeit editierbar (datetime-local)
              [Stop] → Modal mit End-Zeit + Nap-Toggle

Timer aus:    [Timer starten] → bg-green text-ground
              Manuell: Start + End datetime-local + Nap-Toggle

Nap-Toggle:   Zwei Buttons [Nap] [Nacht]
              Aktiv: bg-sapphire text-ground
              Inaktiv: bg-surface1 text-text

Stop-Modal:   fixed inset-0 bg-black/50 z-50
              bg-ground rounded-t-card (Bottom-Sheet-Stil)
```

#### TemperatureForm / WeightForm

```
Input:        type=number, step=0.1 (Temp) / step=10 (Weight)
              bg-surface1 rounded-card px-3 py-2.5
Unit-Label:   °C / g — text-subtext0 font-label
```

### 5.5 TimeInput (Zeitauswahl)

Wiederverwendbare Komponente fuer alle Formulare.

```
Toggle:       [Jetzt] [Andere Zeit]
              flex gap-2
              Aktiv "Jetzt": bg-sapphire text-ground
              Aktiv "Andere": bg-peach text-ground
              Inaktiv: bg-surface0 text-subtext0

Custom:       type=datetime-local
              w-full px-3 py-2.5 bg-surface0 rounded-card
              focus:ring-2 focus:ring-peach
```

### 5.6 VitaminD3Button

Einzeiliger Toggle-Button mit zwei Zustaenden.

```
Container:    bg-surface0 rounded-card p-4 mb-2
Layout:       flex items-center justify-between

Nicht gegeben: px-5 py-2.5 bg-green text-ground rounded-card font-semibold
Gegeben:       CheckCircle-Icon (text-green) + "Gegeben" (text-green, semibold)
```

### 5.7 D3Calendar (Monatskalender)

Vitamin-D3-Tracking als Monatsraster.

```
Container:    bg-surface0 rounded-card p-4
Header:       font-label font-semibold text-sm ("Vitamin D3 — April 2026")
Wochentage:   grid grid-cols-7 gap-1, text-[11px] text-subtext0 font-label
Tage:
  Normal:     w-8 h-8 rounded-full text-[12px] text-subtext0
  Heute:      ring-2 ring-peach text-text font-semibold
  D3 gegeben: bg-green/20 text-green font-semibold
  Vergangen ohne D3: text-subtext0 (keine besondere Markierung)
```

### 5.8 Timeline (Tagesverlauf)

Chronologische Ereignisliste fuer "Heute"-Ansicht.

```
Container:    flex flex-col gap-2
Eintrag:      flex items-start gap-3 bg-surface0 rounded-card p-3
Icon-Bereich: mt-0.5 text-{farbe} (16px Lucide-Icons)
Zeit:         text-[11px] font-label text-subtext0
Beschreibung: text-sm text-text
```

**Icon-Farbzuordnung:**

| Ereignis | Icon | Farbe |
|----------|------|-------|
| Flasche | `Baby` (Lucide) | `sapphire` |
| Windel (nass) | `Droplets` | `blue` |
| Windel (schmutzig) | `Circle` | `yellow` |
| Windel (beides) | `Droplets` | `peach` |
| Windel (trocken) | `Circle` | `subtext0` |
| Schlaf-Start | `Moon` | `lavender` |
| Schlaf-Ende | `Sun` | `yellow` |

### 5.9 EntryListOverlay (Bearbeiten/Loeschen)

Bottom-Sheet-Modal fuer CRUD-Operationen auf vergangene Eintraege.

```
Backdrop:     fixed inset-0 bg-black/40 z-50
Sheet:        fixed bottom-0 left-0 right-0 bg-ground rounded-t-2xl
              max-h-[80vh] overflow-y-auto

Header:       px-4 py-3 border-b border-surface1
              flex items-center justify-between
Titel:        font-headline font-semibold text-text
Schliessen:   X-Icon, text-subtext0 hover:text-text

Eintrag:      px-4 py-3 border-b border-surface0
              flex items-center justify-between
Text:         text-sm text-text
Aktionen:     [Bearbeiten] text-sapphire / [Loeschen] text-red

Bulk-Loeschen: w-full py-2 text-sm font-label text-red
               bg-red/10 rounded-card hover:bg-red/20
Bestaetigung:  Inline-Confirm mit [Abbrechen] + [Loeschen]
```

### 5.10 WeeklyReport (7-Tage-Ansicht)

Tagesweise DayCards mit aggregierten Daten.

```
Layout:       flex flex-col gap-3
DayCard:      bg-surface0 rounded-card p-3
Datum:        font-label font-semibold text-sm
              Heute: text-peach
Metriken:     Grid mit Flaschenmenge, Windelanzahl, Schlafzeit
Trend-Pfeil:  text-green (>=) / text-red (<) gegenueber Vortag
Klick:        Oeffnet EntryListOverlay fuer Kategorie
```

### 5.11 PatternView (14-Tage-Analyse)

Komprimierte Zeitleiste pro Tag mit MiniTimeline-Balken.

```
Layout:       flex flex-col gap-0.5
Tag-Zeile:    flex items-start gap-2
Datum-Label:  text-[11px] font-label w-16 text-right
              Heute: text-peach font-semibold
              Andere: text-subtext0

MiniTimeline: 24h-Balken (h-5 bg-surface1 rounded-full)
              Flaschen: bg-sapphire (Punkte)
              Schlaf: bg-lavender (Balken)
              Windeln: bg-yellow (Punkte)
              Position: prozentual berechnet (Stunde/24 * 100%)

Stunden-Achse: 0 | 6 | 12 | 18
               text-[9px] text-subtext0
```

### 5.12 Toast / Undo

Feedback-Benachrichtigung nach Aktionen.

```
Container:    fixed bottom-4 left-4 right-4 z-40
Toast:        bg-surface0 rounded-card p-3 shadow-lg
              flex items-center justify-between
Text:         text-sm text-text
Undo-Button:  text-sapphire font-label font-semibold
Auto-Dismiss: 5 Sekunden
```

## 6. Interaktionsmuster

### Touch-Targets

```
Minimum:      44px Hoehe fuer alle tippbaren Elemente
Presets:       py-2.5 min-w-[3rem] (ca. 40x44px)
Speichern:     py-3 w-full (volle Breite, 48px Hoehe)
Tab-Buttons:   py-2.5 flex-1 (volle Breite geteilt)
```

### Zustands-Feedback

| Zustand | Visuell |
|---------|---------|
| Aktiv/Selektiert | Farbwechsel zu Akzentfarbe (sapphire/peach) |
| Hover | `hover:bg-surface2` oder `hover:text-text` |
| Active (Touch) | `active:bg-surface1` oder `active:text-peach` |
| Disabled | `opacity-40` |
| Saving | Button-Text → "..." |
| Timer laeuft | Gruener Puls-Punkt (`bg-green rounded-full`) |

### Transitions

```
Standard:     transition-all (150ms default)
Farbwechsel:  transition-colors
```

## 7. PWA & iOS-Optimierungen

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Baby" />
<meta name="theme-color" content="#eff1f5" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#24273a" media="(prefers-color-scheme: dark)" />
```

### iOS-spezifische CSS-Regeln

```css
input, select, textarea {
  font-size: 16px;              /* Verhindert Auto-Zoom auf iOS */
  -webkit-appearance: none;      /* Native Styling entfernen */
}
```

## 8. Icon-System

Alle Icons stammen aus [Lucide React](https://lucide.dev/), Groesse 16–20px.

| Kontext | Icon | Groesse |
|---------|------|---------|
| Timeline-Feeding | `Baby` | 16px |
| Timeline-Windel | `Droplets` / `Circle` | 16px |
| Timeline-Schlaf | `Moon` / `Sun` | 16px |
| Sync-Button | `RefreshCw` | 18px |
| Schliessen | `X` | 20px |
| D3 Gegeben | `CheckCircle` | 20px |
| Bearbeiten | `Pencil` | 14px |
| Loeschen | `Trash2` | 14px |

## 9. Datenarchitektur (UI-relevant)

### Baby Buddy API Proxy

```
Frontend → /baby-api/* → nginx → Baby Buddy REST API (Port 8090)
```

### Datenstrom

```
useBabyApi Hook
  ├── loadData(start, end)     → Heute-Ansicht
  ├── loadWeekData()           → 7-Tage-Report
  ├── loadPattern()            → 14-Tage-Pattern
  ├── submitFeeding(ml, time)
  ├── submitChange(wet, solid, time, color)
  ├── startTimer() / stopTimer(end, nap)
  ├── submitTemperature(temp, time)
  ├── submitWeight(weight, date)
  ├── submitD3()               → Note mit "Vitamin D3"
  ├── patchEntry(type, id, data)
  └── deleteEntry(type, id)
```

### Timezone-Handling

Alle Zeitberechnungen nutzen `Europe/Berlin`. Client-seitige Filterung als Fallback, da die Baby Buddy API `time_min`/`time_max` teilweise ignoriert.

## 10. Do's and Don'ts

### Do

- Surface-Farbstufen fuer Tiefe nutzen (surface0 → surface1 → surface2)
- Presets/Chips anbieten statt Freitexteingabe
- Alle tippbaren Elemente >= 44px hoch machen
- Feedback sofort zeigen (Toast, Farbwechsel, "...")
- Warnungen farblich codieren (gelb = Aufmerksamkeit, rot = kritisch)
- `rounded-card` (1rem) fuer alle Container konsistent verwenden
- Catppuccin-Tokens nutzen, keine Hex-Werte direkt in Komponenten
- Formular nach Speichern zuruecksetzen (State-Reset)

### Don't

- Keine 1px-Borders oder Box-Shadows fuer Tiefe
- Keine modale Bestaetigung fuer Standard-Aktionen (nur fuer Loeschen)
- Keine horizontalen Scroll-Container auf Mobile
- Kein Auto-Zoom durch zu kleine Input-Schriftgroessen (< 16px)
- Keine Custom-Scrollbars oder Scroll-Hijacking
- Keine Animationen > 200ms (Eltern haben keine Geduld)
- Keine dekorativen Elemente ohne Informationsgehalt
- Keine verschachtelten Modals oder mehrstufige Flows

## 11. Agent-Schnellreferenz

Fuer KI-Agenten, die UI-Aenderungen vornehmen:

### Farb-Cheatsheet

```
Primaer-CTA:         bg-peach text-ground
Sekundaer-Auswahl:   bg-sapphire text-ground
Positiv/Erfolg:      bg-green text-ground  ODER  text-green
Destruktiv:          bg-red text-ground    ODER  text-red + bg-red/10
Warnung:             bg-yellow/20 text-yellow  ODER  bg-red/20 text-red
Karte:               bg-surface0 rounded-card p-4
Inaktiver Button:    bg-surface1 text-text hover:bg-surface2
Label (klein):       text-[11px] uppercase tracking-wider text-subtext0 font-label
```

### Neue Komponente erstellen

```jsx
// Standardaufbau einer Tracking-Karte
<div className="bg-surface0 rounded-card p-4 mb-2 overflow-hidden">
  <div className="font-label font-semibold text-text mb-3 text-sm">
    {title}
  </div>
  {/* Inhalt */}
  <button className="w-full py-3 text-sm font-label font-semibold bg-peach text-ground rounded-card hover:opacity-90 disabled:opacity-40 transition-all">
    Speichern
  </button>
</div>
```

### Tech-Stack

```
React 18.3 + Vite 6 + Tailwind CSS 3.4 + React Router 7
Icons: Lucide React
Fonts: Google Fonts (Space Grotesk, Manrope, Inter Tight)
Backend: Baby Buddy REST API via nginx Proxy
Deployment: Docker → Portainer → DS725+
Domain: baby.familie-riedel.org
```
