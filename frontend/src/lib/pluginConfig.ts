/** Plugin activation config — persisted in localStorage.
 *
 * Base plugins (sleep, feeding, diaper) are always active regardless of config.
 * Optional plugins default to enabled and can be toggled by the user.
 */

import { PLUGINS, OPTIONAL_PLUGINS } from "./pluginRegistry";

const STORAGE_KEY = "mybaby_enabled_plugins";

/** All optional plugin keys — used as default when no config exists. */
const ALL_OPTIONAL_KEYS = OPTIONAL_PLUGINS.map((p) => p.key);

/** Read enabled optional plugin keys from localStorage. */
export function getEnabledPlugins(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_OPTIONAL_KEYS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ALL_OPTIONAL_KEYS;
    // Only keep keys that actually exist as optional plugins
    const validKeys = new Set(ALL_OPTIONAL_KEYS);
    return parsed.filter((k): k is string => typeof k === "string" && validKeys.has(k));
  } catch {
    return ALL_OPTIONAL_KEYS;
  }
}

/** Persist enabled optional plugin keys to localStorage. */
export function setEnabledPlugins(keys: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  // Dispatch storage event so other components can react
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

/** Check whether a plugin is currently enabled.
 *  Base plugins always return true. */
export function isPluginEnabled(key: string): boolean {
  const def = PLUGINS.find((p) => p.key === key);
  if (!def) return false;
  if (def.isBase) return true;
  return getEnabledPlugins().includes(key);
}

/** Toggle an optional plugin on/off. Has no effect on base plugins. */
export function togglePlugin(key: string): void {
  const def = PLUGINS.find((p) => p.key === key);
  if (!def || def.isBase) return;

  const current = getEnabledPlugins();
  const next = current.includes(key)
    ? current.filter((k) => k !== key)
    : [...current, key];
  setEnabledPlugins(next);
}
