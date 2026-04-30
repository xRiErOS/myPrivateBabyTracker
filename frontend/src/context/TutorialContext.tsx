/** Tutorial context — manages onboarding step sequence (MBT-167/168/170 Round 2).
 *
 * State persists in UserPreferences (Backend) once user is authenticated.
 * Falls back to localStorage for unauthenticated cases.
 *
 * Steps are filtered by device at provider mount; resize listener keeps the
 * list in sync if the user rotates / resizes between mobile/desktop ranges.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPreferences, updatePreferences } from "../api/preferences";
import { getStepsForDevice, type TutorialStep } from "../components/tutorial/tutorialSteps";

const LOCAL_KEY_COMPLETED = "tutorial_completed";
const LOCAL_KEY_STEP = "tutorial_step";

export interface TutorialState {
  active: boolean;
  step: number;
  completed: boolean;
  steps: TutorialStep[];
  dontShowAgain: boolean;
  /** Manuell pausiert (User hat "Hier umsehen" gewaehlt). */
  paused: boolean;
}

interface TutorialContextValue extends TutorialState {
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  /** Tutorial dauerhaft schließen — unabhängig vom dontShowAgain-State. */
  dismissForever: () => void;
  reset: () => void;
  goTo: (step: number) => void;
  setDontShowAgain: (v: boolean) => void;
  setPaused: (v: boolean) => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const [completed, setCompleted] = useState<boolean>(() =>
    localStorage.getItem(LOCAL_KEY_COMPLETED) === "true",
  );
  const [step, setStep] = useState<number>(() => {
    const raw = localStorage.getItem(LOCAL_KEY_STEP);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  });
  const [active, setActive] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [steps, setSteps] = useState<TutorialStep[]>(() => getStepsForDevice());
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);
  const [paused, setPaused] = useState<boolean>(false);

  // Recompute steps on resize (mobile↔desktop transition)
  useEffect(() => {
    const handler = () => setSteps(getStepsForDevice());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Hydrate from server preferences
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prefs = await getPreferences();
        if (cancelled) return;
        setCompleted(prefs.tutorial_completed);
        setStep(prefs.tutorial_step);
        localStorage.setItem(LOCAL_KEY_COMPLETED, String(prefs.tutorial_completed));
        localStorage.setItem(LOCAL_KEY_STEP, String(prefs.tutorial_step));
      } catch {
        // unauthenticated or backend unavailable — keep localStorage values
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-start on dashboard if not completed
  useEffect(() => {
    if (!hydrated) return;
    if (completed) return;
    if (active) return;
    if (window.location.pathname === "/") {
      setActive(true);
    }
  }, [hydrated, completed, active]);

  const persist = useCallback(
    async (partial: { tutorial_completed?: boolean; tutorial_step?: number }) => {
      if ("tutorial_completed" in partial) {
        localStorage.setItem(LOCAL_KEY_COMPLETED, String(partial.tutorial_completed));
      }
      if ("tutorial_step" in partial) {
        localStorage.setItem(LOCAL_KEY_STEP, String(partial.tutorial_step));
      }
      try {
        await updatePreferences(partial);
      } catch {
        /* unauthenticated — localStorage already updated */
      }
    },
    [],
  );

  const total = steps.length;

  const start = useCallback(() => {
    setActive(true);
    setStep(0);
    setDontShowAgain(true);
    setPaused(false);
  }, []);

  const next = useCallback(() => {
    setPaused(false);
    setStep((prev) => {
      const newStep = prev + 1;
      if (newStep >= total) {
        setActive(false);
        if (dontShowAgain) {
          setCompleted(true);
          void persist({ tutorial_completed: true, tutorial_step: total });
        } else {
          // User wants to see it again — reset to step 0 and leave completed=false
          void persist({ tutorial_completed: false, tutorial_step: 0 });
          return 0;
        }
        return total;
      }
      void persist({ tutorial_step: newStep });
      return newStep;
    });
  }, [persist, total, dontShowAgain]);

  const prev = useCallback(() => {
    setPaused(false);
    setStep((s) => {
      const newStep = Math.max(0, s - 1);
      void persist({ tutorial_step: newStep });
      return newStep;
    });
  }, [persist]);

  const skip = useCallback(() => {
    setActive(false);
    setPaused(false);
    if (dontShowAgain) {
      setCompleted(true);
      void persist({ tutorial_completed: true });
    } else {
      // User explicitly unchecked "don't show again" — keep tutorial available
      void persist({ tutorial_step: 0 });
    }
  }, [persist, dontShowAgain]);

  // Forciert tutorial_completed=true, unabhängig vom aktuellen dontShowAgain-State.
  // Wird vom „Tutorial überspringen und nicht mehr anzeigen"-CTA am Welcome-Step
  // benutzt (MBT-240). Persistierung erfolgt sowohl in localStorage (No-User-Mode)
  // als auch — falls verfügbar — über updatePreferences im Backend.
  const dismissForever = useCallback(() => {
    setActive(false);
    setPaused(false);
    setCompleted(true);
    setDontShowAgain(true);
    void persist({ tutorial_completed: true, tutorial_step: 0 });
  }, [persist]);

  const reset = useCallback(() => {
    setStep(0);
    setCompleted(false);
    setActive(true);
    setDontShowAgain(true);
    setPaused(false);
    void persist({ tutorial_completed: false, tutorial_step: 0 });
  }, [persist]);

  const goTo = useCallback(
    (target: number) => {
      setPaused(false);
      const clamped = Math.max(0, Math.min(total - 1, target));
      setStep(clamped);
      void persist({ tutorial_step: clamped });
    },
    [persist, total],
  );

  const value = useMemo<TutorialContextValue>(
    () => ({
      active,
      step,
      completed,
      steps,
      dontShowAgain,
      paused,
      start,
      next,
      prev,
      skip,
      dismissForever,
      reset,
      goTo,
      setDontShowAgain,
      setPaused,
    }),
    [active, step, completed, steps, dontShowAgain, paused, start, next, prev, skip, dismissForever, reset, goTo],
  );

  return (
    <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}

export function useTutorialOptional(): TutorialContextValue | null {
  return useContext(TutorialContext);
}
