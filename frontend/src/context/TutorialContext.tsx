/** Tutorial context — manages onboarding step sequence (MBT-167/168/170).
 *
 * State persists in UserPreferences (Backend) once user is authenticated.
 * Falls back to localStorage for unauthenticated cases (e.g. before login resolved).
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

const LOCAL_KEY_COMPLETED = "tutorial_completed";
const LOCAL_KEY_STEP = "tutorial_step";

export interface TutorialState {
  active: boolean;
  step: number;
  completed: boolean;
}

interface TutorialContextValue extends TutorialState {
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  reset: () => void;
  goTo: (step: number) => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

interface TutorialProviderProps {
  children: ReactNode;
  totalSteps: number;
}

export function TutorialProvider({ children, totalSteps }: TutorialProviderProps) {
  const [completed, setCompleted] = useState<boolean>(() => {
    return localStorage.getItem(LOCAL_KEY_COMPLETED) === "true";
  });
  const [step, setStep] = useState<number>(() => {
    const raw = localStorage.getItem(LOCAL_KEY_STEP);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  });
  const [active, setActive] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Hydrate from server preferences once
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

  // Auto-start when first reaching dashboard after hydration if not completed
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
        // unauthenticated — localStorage already updated, ignore
      }
    },
    [],
  );

  const start = useCallback(() => {
    setActive(true);
    setStep(0);
  }, []);

  const next = useCallback(() => {
    setStep((prev) => {
      const newStep = prev + 1;
      if (newStep >= totalSteps) {
        setActive(false);
        setCompleted(true);
        void persist({ tutorial_completed: true, tutorial_step: totalSteps });
        return totalSteps;
      }
      void persist({ tutorial_step: newStep });
      return newStep;
    });
  }, [persist, totalSteps]);

  const prev = useCallback(() => {
    setStep((s) => {
      const newStep = Math.max(0, s - 1);
      void persist({ tutorial_step: newStep });
      return newStep;
    });
  }, [persist]);

  const skip = useCallback(() => {
    setActive(false);
    setCompleted(true);
    void persist({ tutorial_completed: true });
  }, [persist]);

  const reset = useCallback(() => {
    setStep(0);
    setCompleted(false);
    setActive(true);
    void persist({ tutorial_completed: false, tutorial_step: 0 });
  }, [persist]);

  const goTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(totalSteps - 1, target));
      setStep(clamped);
      void persist({ tutorial_step: clamped });
    },
    [persist, totalSteps],
  );

  const value = useMemo<TutorialContextValue>(
    () => ({ active, step, completed, start, next, prev, skip, reset, goTo }),
    [active, step, completed, start, next, prev, skip, reset, goTo],
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

/** Optional version — returns null if not within a provider. */
export function useTutorialOptional(): TutorialContextValue | null {
  return useContext(TutorialContext);
}
