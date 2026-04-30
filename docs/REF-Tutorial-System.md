# Tutorial-System — Referenz

Onboarding-Tooltip-Tour für neue Nutzer. Aktiviert sich automatisch beim ersten Besuch von `/`, kann an drei Stellen abgebrochen werden, persistiert pro Nutzer (Backend) bzw. pro Browser (No-User-Mode).

Stand: 2026-04-30 (nach MBT-240 R2)

## Schnelleinstieg

| Frage | Antwort |
|---|---|
| Wo ist der State? | `frontend/src/context/TutorialContext.tsx` (Provider) |
| Wo sind die Schritte definiert? | `frontend/src/components/tutorial/tutorialSteps.ts` |
| Wo wird gerendert? | `frontend/src/components/tutorial/TutorialOverlay.tsx` |
| Wie startet das Tutorial? | Auto-Start auf `/` wenn `completed=false` |
| Wie wird es beendet? | Drei Pfade — siehe [Skip-Pfade](#skip-pfade) |
| Wie reaktivieren? | `ProfilePage` → „Tutorial neu starten" |
| Wo ist Persistenz? | localStorage (sofort) + Backend `updatePreferences` (async) |

## Architektur

```
main.tsx
  └─ TutorialProvider                    Context, State, Persistenz, Hydrate
       └─ TutorialOverlay                Backdrop + Tooltip + Modals
            ├─ FullBackdrop / CutoutBackdrop
            ├─ HighlightBorder           ring um spotlight target
            ├─ Tooltip                   Standard- oder Final-Variante
            ├─ PauseBanner               Off-Path / manuelle Pause
            └─ ConfirmCloseModal         X-Click Bestätigung
```

| Datei | Rolle |
|---|---|
| `src/context/TutorialContext.tsx` | Provider + State-Maschine + Persistenz |
| `src/components/tutorial/TutorialOverlay.tsx` | Render (Backdrop, Spotlight, Tooltip, Modals) |
| `src/components/tutorial/tutorialSteps.ts` | Step-Definitionen + Device-Filter |
| `src/api/preferences.ts` | `getPreferences`, `updatePreferences` (Backend) |
| `src/pages/ProfilePage.tsx` | „Tutorial neu starten"-Button (`tutorial.reset()`) |
| `src/i18n/locales/{de,en}/tutorial.json` | Übersetzungen |

## State-Modell

```ts
interface TutorialState {
  active: boolean;        // Tooltip sichtbar?
  step: number;           // aktueller Step-Index
  completed: boolean;     // dauerhaft abgeschlossen — blockiert Auto-Start
  steps: TutorialStep[];  // device-gefilterte Liste (mobile/desktop/all)
  dontShowAgain: boolean; // Final-Step-Checkbox-State (default: true)
  paused: boolean;        // manuelle Pause via „Hier umsehen"
  hydrated: boolean;      // Backend-Hydrate abgeschlossen?
}
```

Methoden auf dem Context:

| Methode | Zweck |
|---|---|
| `start()` | Manuell starten (step=0, active=true, dontShowAgain=true) |
| `next()` | Nächster Step; am Ende: completed setzen wenn dontShowAgain |
| `prev()` | Vorheriger Step |
| `skip()` | Schließen; persistiert `tutorial_completed=true` nur wenn `dontShowAgain` |
| `dismissForever()` | Schließt dauerhaft, **unabhängig** vom dontShowAgain-State (MBT-240) |
| `reset()` | Zurücksetzen; setzt `completed=false`, `step=0`, `active=true` (Profil-Reset) |
| `goTo(n)` | Springe zu Step n |
| `setDontShowAgain(v)` | Final-Step-Checkbox |
| `setPaused(v)` | Pause toggeln |

## Persistenz-Schichten

Zwei Schichten, beide werden bei jedem Persist-Event geschrieben:

| Schicht | Keys / Felder | Sichtbarkeit |
|---|---|---|
| `localStorage` | `tutorial_completed`, `tutorial_step` | nur dieser Browser |
| Backend (`updatePreferences`) | `tutorial_completed`, `tutorial_step` in `user_preferences` | nutzer-übergreifend, alle Devices |

Im **No-User-Mode** schlägt `updatePreferences` still fehl (catch); localStorage bleibt die einzige Wahrheit.

### Hydrate-Verhalten (MBT-240 R2 — `localStorage_true wins`)

```ts
const localCompleted = localStorage.getItem(LOCAL_KEY_COMPLETED) === "true";
const effectiveCompleted = prefs.tutorial_completed || localCompleted;
```

Hat der Nutzer das Tutorial einmal lokal abgelehnt, kann ein Backend-Default `false` den Wert nicht mehr überschreiben. Bei Mismatch (local=true, backend=false) wird Backend per silentem `updatePreferences({ tutorial_completed: true })` nachsynchronisiert.

## Lifecycle

```
Initial Mount
  ├─ useState liest localStorage           completed = LS["tutorial_completed"]
  ├─ Hydrate useEffect ruft getPreferences
  │    ├─ 200 OK     → effectiveCompleted = backend || local
  │    └─ throw      → localStorage-Wert behalten
  └─ Auto-Start useEffect
       └─ if (hydrated && !completed && !active && location.pathname==="/")
            → setActive(true)

Aktiv
  ├─ Step n         → next/prev/goTo
  ├─ Off-Path       → PauseBanner (expectedPath nicht aktuelle Route)
  ├─ Manuell pause  → setPaused(true) („Hier umsehen")
  └─ Final-Step     → onNext + dontShowAgain → completed=true

Skip-Pfade — siehe nächster Abschnitt
```

## Skip-Pfade

Drei Wege, das Tutorial zu beenden — nicht alle haben dieselbe Persistenz-Garantie:

| Pfad | Trigger | Methode | Persistiert `completed=true`? |
|---|---|---|---|
| 1. Welcome-Skip-CTA | „Tutorial überspringen und nicht mehr anzeigen" am Step 0 (MBT-240) | `dismissForever()` | **Immer ja**, unabhängig vom State |
| 2. Final-Step + Checkbox | Letzter Step → „End tutorial" | `next()` | Nur wenn `dontShowAgain=true` (Default) |
| 3. X → Confirm → Abort | Schließen-Button → ConfirmCloseModal → „Tutorial abbrechen" | `skip()` | Nur wenn `dontShowAgain=true` (Default) |

Pfad 1 ist der einzige garantierte Opt-Out und der empfohlene CTA für Nutzer, die das Tutorial nicht durchlaufen möchten.

## Reaktivierung

`ProfilePage.tsx` zeigt einen Button „Tutorial neu starten":

```tsx
<button onClick={() => tutorial?.reset()} disabled={!tutorial}>
  {ttut("reset")}
</button>
```

`reset()`:
- `completed=false`, `step=0`, `active=true`, `dontShowAgain=true`, `paused=false`
- Persistiert `tutorial_completed=false`, `tutorial_step=0`

Beim nächsten Besuch von `/` startet das Tutorial automatisch (Auto-Start-`useEffect`).

## Step-Definition

```ts
interface TutorialStep {
  id: string;
  titleKey: string;             // i18n-Key
  descriptionKey: string;
  actionPromptKey?: string;     // optionale Aufforderung (zentriert, mauve, fett)
  targetSelector: string | null; // CSS-Selector für Spotlight
  device?: "mobile" | "desktop" | "all";
  action?: {
    type: "click" | "navigate" | "url_param" | "event" | "none";
    selector?: string;
    route?: string;
    param?: string;
    event?: string;
  };
  isFinal?: boolean;            // Final-Step (Reset+End-UI mit Checkbox)
  nextButtonKey?: string;       // Override Next-Button-Label
  openMobileMenu?: boolean;     // Beim Mount Burger öffnen
  forceEnableNext?: boolean;    // Next aktivieren trotz click/event-Action
  forceNextOpensMenu?: boolean; // Next öffnet Burger
  closeMobileMenuOnNext?: boolean;
  expectedPath?: string;        // Pathname-Prefix; sonst Off-Path-Pause
  pauseOnTargetClick?: boolean; // Klick auf Spotlight pausiert statt advance
  resumeEvent?: string;         // Custom-Event beim „Fortsetzen"
}
```

### Action-Typen

| Typ | Verhalten |
|---|---|
| `click` | Tooltip wartet auf Klick auf `selector` (Next deaktiviert sofern `forceEnableNext` nicht gesetzt) |
| `navigate` | Programmatic `navigate(route)` beim Next-Klick |
| `url_param` | Step advanced, sobald URL den `param` enthält |
| `event` | Wartet auf Custom-Event über `window.addEventListener` |
| `none` | Nur Next/Prev manuell |

## Off-Path / Pause-Modi

**Off-Path** = Step erwartet `expectedPath`, aber `location.pathname` matched nicht. Ergebnis: PauseBanner unten + kein Spotlight.

```ts
const isOffPath = !!step && !step.isFinal
  && !!step.expectedPath
  && !isOnExpectedPath(location.pathname, step.expectedPath)
  && !(step.action?.type === "navigate"
       && isOnExpectedPath(location.pathname, step.action.route));
```

**Manuelle Pause** = User klickt im ConfirmCloseModal „Hier umsehen". Setzt `paused=true`. PauseBanner zeigt „Fortsetzen"-Button.

**Resume-Logik:**
- Off-Path → Navigate zurück zum `expectedPath`
- Sonst → `setPaused(false)`
- Falls `step.resumeEvent` definiert → Custom-Event dispatchen (z.B. um Tab-State zurückzusetzen)

## Custom Events

| Event | Zweck |
|---|---|
| `mybaby:tutorial:open-mobile-menu` | Burger-Menu programmatisch öffnen |
| `mybaby:tutorial:close-mobile-menu` | Burger-Menu programmatisch schließen |
| `<step.resumeEvent>` | Step-spezifisch beim Resume (z.B. Tab zurücksetzen) |

Senden:
```ts
window.dispatchEvent(new CustomEvent("mybaby:tutorial:open-mobile-menu"));
```

## Spotlight / Backdrop / HighlightBorder

- `FullBackdrop` — Vollflächiger blurred Overlay (Welcome, Final, Off-Path)
- `CutoutBackdrop` — Backdrop mit Loch um den `targetSelector`-Rect
- `HighlightBorder` — Animierter Ring um den Cutout
- Tooltip-Position: relativ zum Rect (oberhalb/unterhalb je nach Platz) oder zentriert wenn kein Rect

Rect-Berechnung erfolgt über `getBoundingClientRect`, ein `MutationObserver` reagiert auf DOM-Mutationen, `scrollIntoView` einmal pro Step (Schutz gegen Endlosschleifen, siehe `scrolledStepIdRef`).

## i18n-Keys (`tutorial.json`)

Globale Keys (oberste Ebene):

| Key | de | en |
|---|---|---|
| `next` | Weiter | Next |
| `prev` | Zurück | Back |
| `skip` | Tutorial überspringen | Skip tutorial |
| `skip_permanent` | Tutorial überspringen und nicht mehr anzeigen | Skip tutorial and don't show again |
| `end_tutorial` | Einführung beenden | End tutorial |
| `restart` | Neu starten | Restart |
| `dont_show_again` | Tutorial beim nächsten Start nicht erneut anzeigen | Don't show this tutorial again on next start |
| `resume` | Fortsetzen | Resume |
| `paused` | Tutorial pausiert | Tutorial paused |
| `confirm_close.{title,body,minimize,abort}` | siehe Datei | siehe Datei |
| `reset` / `reset_description` | Profil-Reset-Button | Profile reset button |

Step-Keys: `step.<id>.{title,description,action,actionPrompt}` (je nach Step variiert; `*_mobile` / `*_desktop`-Suffixe für Device-Varianten).

## Edge-Cases & bekannte Bugs

| Bug | Status | Fix |
|---|---|---|
| `MBT-167/168/170` — Pause/Action-Prompt/Off-Path | gelöst (Round 7) | bestehender Code |
| `MBT-240` — Tutorial nicht dauerhaft ablehnbar | gelöst (R1) | `dismissForever()` + Welcome-CTA |
| `MBT-240 R2` — Backend-Hydrate-Race | gelöst | `localStorage_true wins` |

### Anti-Patterns / Stolperfallen

- **Step ohne `expectedPath`** → kein Off-Path-Schutz; User kann auf andere Page navigieren und das Tutorial bleibt aktiv mit kaputtem Spotlight.
- **`pauseOnTargetClick` ohne passenden `resumeEvent`** → User pausiert, kommt zurück, aber UI-State ist falsch (z.B. Tab nicht zurückgesetzt).
- **`completed=false` lokal + Backend-Default `false`** ist OK; aber `completed=true` lokal darf NIE durch Backend `false` überschrieben werden — siehe Hydrate-Logik.
- **`setDontShowAgain` synchron lesen nach setState** — Closure-Capture beachten; lieber explizite Methode (`dismissForever`) als `setDontShowAgain(true); skip()`.

## Neuen Step hinzufügen

1. **`tutorialSteps.ts`** — Step-Objekt in `ALL_TUTORIAL_STEPS` an passender Stelle einfügen:
   ```ts
   {
     id: "my_new_step",
     titleKey: "step.my_new_step.title",
     descriptionKey: "step.my_new_step.description",
     targetSelector: '[data-tutorial="my-target"]',
     expectedPath: "/some-route",
   },
   ```
2. **`{de,en}/tutorial.json`** — Übersetzungen unter `step.my_new_step.{title,description}` ergänzen.
3. **Ziel-Element markieren** — `data-tutorial="my-target"` an die anzuvisierende Komponente.
4. **CSP/iframe** — Falls neuer Step auf einer Seite mit eigener CSP läuft, sicherstellen dass Tutorial-Scripts nicht blockiert werden.
5. **Test:** Aus dem Profil heraus `tutorial.reset()` triggern, ans Step durchklicken, Spotlight + Pause + Off-Path prüfen.

## Reaktivierungs- und Persistenz-Pfade (Sequenz-Diagramm)

```
Nutzer akzeptiert Skip (Welcome):
  Klick → dismissForever()
       ├─ setActive(false), setCompleted(true), setDontShowAgain(true)
       ├─ localStorage["tutorial_completed"] = "true"  (sync)
       └─ updatePreferences({completed:true}) (async, optional)

Nutzer reaktiviert (Profil):
  Klick → reset()
       ├─ setCompleted(false), setStep(0), setActive(true)
       ├─ localStorage["tutorial_completed"] = "false"  (sync)
       └─ updatePreferences({completed:false, step:0}) (async)

App-Reload nach Skip:
  Mount
    ├─ useState init → completed = LS = true
    ├─ Hydrate
    │    ├─ getPreferences() → backend möglicherweise true ODER false
    │    └─ effectiveCompleted = backend || local = true (immer)
    └─ Auto-Start: if (completed) return → kein Tutorial
```

## History / Issue-Referenzen

| Issue | Bereich |
|---|---|
| `MBT-167` | Initiale Tutorial-Implementierung |
| `MBT-168` | Action-Prompt + Burger-Menü-Steuerung |
| `MBT-170` | Final-Step + Reset über Profil |
| `MBT-240` | Welcome-Skip-CTA + Hydrate-Race-Fix |

Commits zur Orientierung: `git log --oneline -- frontend/src/components/tutorial frontend/src/context/TutorialContext.tsx`.

## Wartungshinweise

- `LOCAL_KEY_COMPLETED` und `LOCAL_KEY_STEP` sind als Konstanten in `TutorialContext.tsx` definiert — bei Renaming Migration einplanen (`tutorial_completed_v2` etc.) oder Migrationscode in den useState-Initializer.
- Bei neuen Sprachen `tutorial.json` in `frontend/src/i18n/locales/<lang>/` anlegen; `skip_permanent` muss Pflichtfeld sein.
- Performance: `MutationObserver` ist global aktiv solange Tutorial läuft. Cleanup in `useEffect`-Return ist gesetzt; bei Refactoring nicht entfernen.
