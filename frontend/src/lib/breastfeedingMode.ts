/**
 * Breastfeeding / feeding mode helpers.
 *
 * MBT-175: Stillmodus liegt jetzt am Kind (`Child.breastfeeding_enabled`),
 * nicht mehr in localStorage / user_preferences. Hybrid-Modus bleibt
 * user-Preference (localStorage als Schnellspeicher).
 */

import type { Child } from "../api/types";

const HYBRID_KEY = "mybaby-feeding-hybrid";

/**
 * Liefert den Stillmodus für ein Kind. Fallback `true`, falls noch kein
 * Kind gewählt ist (z.B. initiales Render bevor ChildContext geladen hat).
 */
export function isBreastfeedingForChild(child: Child | null | undefined): boolean {
  if (!child) return true;
  // Defensive: ältere API-Antworten ohne Feld → Default true.
  return child.breastfeeding_enabled ?? true;
}

export function isFeedingHybrid(): boolean {
  try {
    return localStorage.getItem(HYBRID_KEY) === "true";
  } catch {
    return false;
  }
}

export function setFeedingHybrid(enabled: boolean): void {
  try {
    localStorage.setItem(HYBRID_KEY, String(enabled));
  } catch {
    // ignore storage errors
  }
}
