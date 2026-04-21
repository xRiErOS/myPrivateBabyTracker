/** Mobile bottom navigation — 4 fixed items + burger menu drawer.

Fixed items: Dashboard + 3 base plugins (Schlaf, Mahlzeiten, Windeln).
Burger opens a drawer with all other enabled plugins + Verwaltung.
Touch targets: min 44px. Only visible on mobile (< md).
*/

import { useEffect, useState } from "react";
import {
  Activity,
  CheckSquare,
  Droplets,
  LayoutDashboard,
  Menu,
  Moon,
  Pill,
  Scale,
  Settings,
  Star,
  Tags,
  Thermometer,
  Timer,
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

/** Fixed bottom bar items — always these 4, never change. */
const FIXED_ITEMS: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sleep", icon: Moon, label: "Schlaf", pluginKey: "sleep" },
  { to: "/feeding", icon: Utensils, label: "Mahlzeiten", pluginKey: "feeding" },
  { to: "/diaper", icon: Droplets, label: "Windeln", pluginKey: "diaper" },
];

/** Menu drawer items — shown in burger menu, filtered by enabled plugins. */
const DRAWER_ITEMS: NavItem[] = [
  { to: "/tags", icon: Tags, label: "Tags", pluginKey: "tags" },
  { to: "/temperature", icon: Thermometer, label: "Temperatur", pluginKey: "temperature" },
  { to: "/weight", icon: Scale, label: "Gewicht", pluginKey: "weight" },
  { to: "/medication", icon: Pill, label: "Medikamente", pluginKey: "medication" },
  { to: "/health", icon: Activity, label: "Gesundheit", pluginKey: "health" },
  { to: "/tummy-time", icon: Timer, label: "Bauchlage", pluginKey: "tummytime" },
  { to: "/todo", icon: CheckSquare, label: "ToDo", pluginKey: "todo" },
  { to: "/milestones", icon: Star, label: "Meilensteine", pluginKey: "milestones" },
  { to: "/admin", icon: Settings, label: "Verwaltung" },
];

function useFilteredDrawerItems(): NavItem[] {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return DRAWER_ITEMS.filter(
    (item) => !item.pluginKey || isPluginEnabled(item.pluginKey),
  );
}

export function BottomNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const drawerItems = useFilteredDrawerItems();

  // Highlight burger when current route is in the drawer
  const isDrawerActive = drawerItems.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"),
  );

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-crust/60 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer panel — slides up from bottom */}
      {drawerOpen && (
        <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 right-0 z-50 bg-surface0 border-t border-surface1 rounded-t-2xl px-4 py-3 md:hidden animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="font-headline text-sm font-semibold text-text">Navigation</span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-text"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {drawerItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
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
      )}

      {/* Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface0 border-t border-surface1 px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-center justify-around">
          {FIXED_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-2 px-1 text-xs font-label transition-colors ${
                  isActive
                    ? "text-mauve font-medium"
                    : "text-subtext0 hover:text-text"
                }`
              }
            >
              <Icon size={20} />
              <span className="mt-0.5">{label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-2 px-1 text-xs font-label transition-colors ${
              isDrawerActive || drawerOpen
                ? "text-mauve font-medium"
                : "text-subtext0 hover:text-text"
            }`}
          >
            <Menu size={20} />
            <span className="mt-0.5">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
