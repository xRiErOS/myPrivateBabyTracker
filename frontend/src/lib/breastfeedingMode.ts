/**
 * Breastfeeding / feeding mode helpers.
 *
 * Stillmodus + Hybridmodus liegen am Kind (`Child.breastfeeding_enabled`,
 * `Child.feeding_hybrid`), nicht mehr in localStorage / user_preferences.
 */

import type { Child } from "../api/types";

/**
 * Liefert den Stillmodus für ein Kind. Fallback `true`, falls noch kein
 * Kind gewählt ist (z.B. initiales Render bevor ChildContext geladen hat).
 */
export function isBreastfeedingForChild(child: Child | null | undefined): boolean {
  if (!child) return true;
  return child.breastfeeding_enabled ?? true;
}

/** Hybridmodus pro Kind — zeigt Brust- + Flaschenkacheln gleichzeitig. */
export function isHybridForChild(child: Child | null | undefined): boolean {
  if (!child) return false;
  return child.feeding_hybrid ?? false;
}
