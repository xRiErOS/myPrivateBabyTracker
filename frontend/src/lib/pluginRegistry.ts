/** Central plugin registry — single source of truth for plugin metadata. */

import { Activity, CheckSquare, ClipboardCheck, Droplets, FileText, HeartPulse, Moon, Pill, Scale, Star, Sun, Tags, Thermometer, Timer, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import i18n from "../i18n";

export type PluginCategory = "tracking" | "development" | "organization";

export interface PluginDef {
  key: string;
  label: string;
  icon: LucideIcon;
  route: string;
  /** Base plugins are always active and cannot be disabled. */
  isBase: boolean;
  /** Thematic group for navigation. (MBT-181) */
  category: PluginCategory;
  /** Optional plugins that should be DISABLED by default (privacy-sensitive). */
  defaultDisabled?: boolean;
}

export const PLUGINS: PluginDef[] = [
  // Tracking — Tagesablauf, Pflege, Gesundheit
  { key: "sleep", label: "Schlaf", icon: Moon, route: "/sleep", isBase: true, category: "tracking" },
  { key: "feeding", label: "Mahlzeiten", icon: Utensils, route: "/feeding", isBase: true, category: "tracking" },
  { key: "diaper", label: "Windel", icon: Droplets, route: "/diaper", isBase: true, category: "tracking" },
  { key: "temperature", label: "Temperatur", icon: Thermometer, route: "/temperature", isBase: false, category: "tracking" },
  { key: "weight", label: "Gewicht", icon: Scale, route: "/weight", isBase: false, category: "tracking" },
  { key: "health", label: "Wohlbefinden", icon: Activity, route: "/health", isBase: false, category: "tracking" },
  { key: "tummytime", label: "Bauchlage", icon: Timer, route: "/tummy-time", isBase: false, category: "tracking" },
  { key: "medication", label: "Medikament", icon: Pill, route: "/medication", isBase: false, category: "tracking" },
  { key: "vitamind3", label: "Vitamin D3", icon: Sun, route: "", isBase: false, category: "tracking" },

  // Development — Meilensteine, U-Untersuchungen
  { key: "milestones", label: "Meilensteine", icon: Star, route: "/milestones", isBase: false, category: "development" },
  { key: "checkup", label: "U-Untersuchungen", icon: ClipboardCheck, route: "/checkup", isBase: false, category: "development" },

  // Organization — Tasks, Notizen, Tags
  { key: "todo", label: "Tasks & Habits", icon: CheckSquare, route: "/todo", isBase: false, category: "organization" },
  { key: "notes", label: "Notizen", icon: FileText, route: "/notes", isBase: false, category: "organization" },
  { key: "motherhealth", label: "Muttergesundheit", icon: HeartPulse, route: "/motherhealth", isBase: false, category: "organization", defaultDisabled: true },
  { key: "tags", label: "Tags", icon: Tags, route: "/tags", isBase: false, category: "organization" },
];

/** Plugins that are always active and cannot be disabled. */
export const BASE_PLUGINS = PLUGINS.filter((p) => p.isBase);

/** Plugins that can be toggled on/off by the user. */
export const OPTIONAL_PLUGINS = PLUGINS.filter((p) => !p.isBase);

/** Get translated plugin label using i18n common.nav namespace. */
export function getPluginLabel(key: string): string {
  return i18n.t(`nav.${key}`, { ns: "common" });
}

/** Categories in display order (MBT-181). */
export const PLUGIN_CATEGORIES: PluginCategory[] = [
  "tracking",
  "development",
  "organization",
];
