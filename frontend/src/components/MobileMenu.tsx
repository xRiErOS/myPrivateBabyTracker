/** Mobile navigation drawer — opened from burger button in Header.

Shows all enabled plugins + Verwaltung in a slide-down panel.
Only visible on mobile (< md). Closes on navigation.
*/

import { useEffect, useState } from "react";
import {
  Activity,
  CheckSquare,
  Droplets,
  LayoutDashboard,
  Moon,
  Pill,
  Scale,
  Settings,
  Star,
  Tags,
  Thermometer,
  Timer,
  User,
  Utensils,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { isPluginEnabled } from "../lib/pluginConfig";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  pluginKey?: string;
}

const ALL_ITEMS: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sleep", icon: Moon, label: "Schlaf", pluginKey: "sleep" },
  { to: "/feeding", icon: Utensils, label: "Mahlzeiten", pluginKey: "feeding" },
  { to: "/diaper", icon: Droplets, label: "Windeln", pluginKey: "diaper" },
  { to: "/tags", icon: Tags, label: "Tags", pluginKey: "tags" },
  { to: "/temperature", icon: Thermometer, label: "Temperatur", pluginKey: "temperature" },
  { to: "/weight", icon: Scale, label: "Gewicht", pluginKey: "weight" },
  { to: "/medication", icon: Pill, label: "Medikamente", pluginKey: "medication" },
  { to: "/health", icon: Activity, label: "Gesundheit", pluginKey: "health" },
  { to: "/tummy-time", icon: Timer, label: "Bauchlage", pluginKey: "tummytime" },
  { to: "/todo", icon: CheckSquare, label: "ToDo", pluginKey: "todo" },
  { to: "/milestones", icon: Star, label: "Meilensteine", pluginKey: "milestones" },
  { to: "/profile", icon: User, label: "Mein Profil" },
  { to: "/admin", icon: Settings, label: "Verwaltung" },
];

function useVisibleItems(): NavItem[] {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return ALL_ITEMS.filter(
    (item) => !item.pluginKey || isPluginEnabled(item.pluginKey),
  );
}

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const location = useLocation();
  const items = useVisibleItems();

  // Close on navigation
  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55] bg-crust/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      {/* Drawer — slides down from top */}
      <div className="fixed top-[52px] left-0 right-0 z-[56] bg-surface0 border-b border-surface1 rounded-b-2xl px-4 py-4 md:hidden animate-fade-in max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="font-headline text-sm font-semibold text-text">Navigation</span>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-text"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-h-[60px] rounded-xl py-2 px-1 text-xs font-label transition-colors ${
                  isActive
                    ? "bg-mauve/15 text-mauve font-medium"
                    : "text-subtext0 hover:bg-surface1 hover:text-text"
                }`
              }
            >
              <Icon size={22} />
              <span className="mt-1">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}
