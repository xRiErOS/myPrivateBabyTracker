/** Central plugin registry — single source of truth for plugin metadata. */

import { Droplets, Moon, Pill, Scale, Thermometer, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PluginDef {
  key: string;
  label: string;
  icon: LucideIcon;
  route: string;
}

export const PLUGINS: PluginDef[] = [
  { key: "sleep", label: "Schlaf", icon: Moon, route: "/sleep" },
  { key: "feeding", label: "Mahlzeiten", icon: Utensils, route: "/feeding" },
  { key: "diaper", label: "Windel", icon: Droplets, route: "/diaper" },
  { key: "temperature", label: "Temperatur", icon: Thermometer, route: "/temperature" },
  { key: "weight", label: "Gewicht", icon: Scale, route: "/weight" },
  { key: "medication", label: "Medikament", icon: Pill, route: "/medication" },
];
