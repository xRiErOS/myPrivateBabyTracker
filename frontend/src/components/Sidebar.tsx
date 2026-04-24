/** Desktop sidebar navigation — hidden on mobile. Dynamically filters by enabled plugins. */

import { useEffect, useState } from "react";
import { Activity, CheckSquare, ClipboardCheck, Droplets, FileText, LayoutDashboard, Moon, Pill, Scale, Settings, Star, Tags, Thermometer, Timer, User, Utensils } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { isPluginEnabled } from "../lib/pluginConfig";

interface SidebarItem {
  to: string;
  icon: LucideIcon;
  label: string;
  pluginKey?: string;
}

const ALL_NAV_ITEMS: SidebarItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sleep", icon: Moon, label: "Schlaf", pluginKey: "sleep" },
  { to: "/feeding", icon: Utensils, label: "Mahlzeiten", pluginKey: "feeding" },
  { to: "/diaper", icon: Droplets, label: "Windeln", pluginKey: "diaper" },
  { to: "/temperature", icon: Thermometer, label: "Temperatur", pluginKey: "temperature" },
  { to: "/weight", icon: Scale, label: "Gewicht", pluginKey: "weight" },
  { to: "/medication", icon: Pill, label: "Medikamente", pluginKey: "medication" },
  { to: "/health", icon: Activity, label: "Wohlbefinden", pluginKey: "health" },
  { to: "/tummy-time", icon: Timer, label: "Bauchlage", pluginKey: "tummytime" },
  { to: "/todo", icon: CheckSquare, label: "Tasks & Habits", pluginKey: "todo" },
  { to: "/milestones", icon: Star, label: "Meilensteine", pluginKey: "milestones" },
  { to: "/tags", icon: Tags, label: "Tags", pluginKey: "tags" },
  { to: "/checkup", icon: ClipboardCheck, label: "U-Untersuchungen", pluginKey: "checkup" },
  { to: "/notes", icon: FileText, label: "Notizen", pluginKey: "notes" },
  { to: "/profile", icon: User, label: "Profil" },
  { to: "/admin", icon: Settings, label: "Verwaltung" },
];

export function Sidebar() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const navItems = ALL_NAV_ITEMS.filter(
    (item) => !item.pluginKey || isPluginEnabled(item.pluginKey),
  );
  return (
    <aside className="hidden md:flex flex-col w-56 bg-surface0 fixed top-[52px] left-0 bottom-0 py-6 px-3 border-r border-surface1 overflow-y-auto">
      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 min-h-[44px] px-3 py-2.5 rounded-[8px] font-label text-sm font-medium transition-colors ${
                isActive
                  ? "bg-mauve/10 text-mauve"
                  : "text-subtext0 hover:bg-surface1 hover:text-text"
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
