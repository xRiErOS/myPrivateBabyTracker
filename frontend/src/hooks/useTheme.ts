/** Theme hook — supports Light / Dark / System mode (MBT-178).
 *
 * `mode` is the user-selected preference (persisted in localStorage).
 * `theme` is the effective theme actually applied to the document
 * (resolved from `system` via `prefers-color-scheme` when needed).
 *
 * Backwards compatibility: legacy values "light"/"dark" stored under
 * `mybaby-theme` are still respected.
 */

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "mybaby-theme";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return null;
}

function resolveTheme(mode: ThemeMode): Theme {
  return mode === "system" ? getSystemTheme() : mode;
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(
    () => getStoredMode() ?? "system",
  );
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(mode));

  // Apply theme to document + persist mode.
  useEffect(() => {
    const effective = resolveTheme(mode);
    setTheme(effective);
    const root = document.documentElement;
    root.setAttribute("data-theme", effective);
    if (effective === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage unavailable (private mode, jsdom in some tests) — non-fatal
    }
  }, [mode]);

  // React to OS theme changes when in "system" mode.
  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const effective = getSystemTheme();
      setTheme(effective);
      const root = document.documentElement;
      root.setAttribute("data-theme", effective);
      if (effective === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, mode, setMode, toggle } as const;
}
