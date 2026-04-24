/** Plugin activation config — persisted in localStorage.
 *
 * Base plugins (sleep, feeding, diaper) are always active regardless of config.
 * Optional plugins default to enabled and can be toggled by the user.
 */

import { PLUGINS, OPTIONAL_PLUGINS } from "./pluginRegistry";

const STORAGE_KEY = "mybaby_enabled_plugins";
const DASHBOARD_KEY = "mybaby_dashboard_visible";

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

/* ─── Dashboard visibility (independent of plugin activation) ─── */

/** All plugin keys + standalone widget keys — used as default when no dashboard config exists. */
const ALL_PLUGIN_KEYS = PLUGINS.map((p) => p.key);

/** Standalone widget keys that are not plugins but can appear on the dashboard.
 *  These are sub-widgets of an existing plugin (e.g. habits is part of todo). */
const STANDALONE_WIDGET_KEYS = ["habits"] as const;

/** All valid dashboard keys (plugins + standalone widgets). */
const ALL_DASHBOARD_KEYS = [...ALL_PLUGIN_KEYS, ...STANDALONE_WIDGET_KEYS];

/** Read dashboard-visible plugin keys from localStorage. */
export function getDashboardVisiblePlugins(): string[] {
  try {
    const raw = localStorage.getItem(DASHBOARD_KEY);
    if (!raw) return ALL_DASHBOARD_KEYS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ALL_DASHBOARD_KEYS;
    const validKeys = new Set(ALL_DASHBOARD_KEYS);
    return parsed.filter((k): k is string => typeof k === "string" && validKeys.has(k));
  } catch {
    return ALL_DASHBOARD_KEYS;
  }
}

/** Persist dashboard-visible plugin keys to localStorage. */
export function setDashboardVisiblePlugins(keys: string[]): void {
  localStorage.setItem(DASHBOARD_KEY, JSON.stringify(keys));
  window.dispatchEvent(new StorageEvent("storage", { key: DASHBOARD_KEY }));
}

/** Map of standalone widget keys to their parent plugin key.
 *  The parent plugin must be enabled for the widget to be visible. */
const WIDGET_PARENT: Record<string, string> = {
  habits: "todo",
};

/** Check whether a plugin or standalone widget is visible on the dashboard.
 *  For regular plugins: only relevant if the plugin is also enabled.
 *  For standalone widgets: parent plugin must be enabled. */
export function isVisibleOnDashboard(key: string): boolean {
  const parentKey = WIDGET_PARENT[key];
  if (parentKey !== undefined) {
    // Standalone widget — parent plugin must be enabled
    if (!isPluginEnabled(parentKey)) return false;
  } else {
    if (!isPluginEnabled(key)) return false;
  }
  return getDashboardVisiblePlugins().includes(key);
}

/** Toggle dashboard visibility for a plugin. */
export function toggleDashboardVisibility(key: string): void {
  const current = getDashboardVisiblePlugins();
  const next = current.includes(key)
    ? current.filter((k) => k !== key)
    : [...current, key];
  setDashboardVisiblePlugins(next);
}

/* ─── Widget grid order ─── */

const ORDER_KEY = "mybaby_widget_order";

/** Default widget order for the dashboard grid. */
const DEFAULT_WIDGET_ORDER = [
  "temperature", "medication", "weight", "health",
  "tummytime", "milestones", "todo", "habits", "tags",
];

/** Read widget order from localStorage. */
export function getWidgetOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return DEFAULT_WIDGET_ORDER;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_WIDGET_ORDER;
    const valid = new Set(DEFAULT_WIDGET_ORDER);
    const ordered = parsed.filter((k): k is string => typeof k === "string" && valid.has(k));
    // Add any new widgets that aren't in stored order
    for (const key of DEFAULT_WIDGET_ORDER) {
      if (!ordered.includes(key)) ordered.push(key);
    }
    return ordered;
  } catch {
    return DEFAULT_WIDGET_ORDER;
  }
}

/** Save widget order to localStorage. */
export function setWidgetOrder(order: string[]): void {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  window.dispatchEvent(new StorageEvent("storage", { key: ORDER_KEY }));
}

/** Move a widget up or down in the order. */
export function moveWidget(key: string, direction: "up" | "down"): void {
  const order = getWidgetOrder();
  const idx = order.indexOf(key);
  if (idx < 0) return;
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= order.length) return;
  [order[idx], order[targetIdx]] = [order[targetIdx], order[idx]];
  setWidgetOrder(order);
}
