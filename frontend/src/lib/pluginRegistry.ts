/** Central plugin registry — single source of truth for plugin metadata. */

import { Activity, CheckSquare, Droplets, Moon, Pill, Scale, Sun, Tags, Thermometer, Timer, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PluginDef {
  key: string;
  label: string;
  icon: LucideIcon;
  route: string;
  /** Base plugins are always active and cannot be disabled. */
  isBase: boolean;
}

export const PLUGINS: PluginDef[] = [
  { key: "sleep", label: "Schlaf", icon: Moon, route: "/sleep", isBase: true },
  { key: "feeding", label: "Mahlzeiten", icon: Utensils, route: "/feeding", isBase: true },
  { key: "diaper", label: "Windel", icon: Droplets, route: "/diaper", isBase: true },
  { key: "temperature", label: "Temperatur", icon: Thermometer, route: "/temperature", isBase: false },
  { key: "weight", label: "Gewicht", icon: Scale, route: "/weight", isBase: false },
  { key: "medication", label: "Medikament", icon: Pill, route: "/medication", isBase: false },
  { key: "vitamind3", label: "Vitamin D3", icon: Sun, route: "", isBase: false },
  { key: "health", label: "Gesundheit", icon: Activity, route: "/health", isBase: false },
  { key: "todo", label: "ToDo", icon: CheckSquare, route: "/todo", isBase: false },
  { key: "tummytime", label: "Bauchlage", icon: Timer, route: "/tummy-time", isBase: false },
  { key: "tags", label: "Tags", icon: Tags, route: "/tags", isBase: false },
];

/** Plugins that are always active and cannot be disabled. */
export const BASE_PLUGINS = PLUGINS.filter((p) => p.isBase);

/** Plugins that can be toggled on/off by the user. */
export const OPTIONAL_PLUGINS = PLUGINS.filter((p) => !p.isBase);
