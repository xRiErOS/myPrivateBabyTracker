/** Adaptive bottom navigation — 4 favorites + "Mehr" menu for additional items.

Touch targets: min 44px. Dynamically filters by enabled plugins.
*/

import { useEffect, useState } from "react";
import {
  Activity,
  CheckSquare,
  Droplets,
  LayoutDashboard,
  MoreHorizontal,
  Moon,
  Pill,
  Scale,
  Settings,
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
  /** If set, item is only shown when this plugin is enabled. */
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

export function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const location = useLocation();
  const visibleItems = useVisibleItems();

  const FAVORITES = visibleItems.slice(0, 5);
  const MORE_ITEMS = visibleItems.slice(5);

  // Check if current route is in the "more" section
  const isMoreActive = MORE_ITEMS.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"),
  );

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-crust/50"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More Menu Panel */}
      {showMore && (
        <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 right-0 z-50 bg-surface0 border-t border-surface1 rounded-t-2xl px-4 py-3 md:hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="font-label text-sm text-subtext0">Mehr</span>
            <button
              onClick={() => setShowMore(false)}
              className="p-1.5 text-subtext0 hover:text-text"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center min-h-[60px] rounded-xl py-2 px-1 text-xs font-label transition-colors ${
                    isActive
                      ? "bg-mauve/15 text-mauve"
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
          {FAVORITES.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-2 px-1 text-xs font-label transition-colors ${
                  isActive ? "text-mauve" : "text-subtext0 hover:text-text"
                }`
              }
            >
              <Icon size={20} />
              <span className="mt-0.5">{label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-2 px-1 text-xs font-label transition-colors ${
              isMoreActive || showMore
                ? "text-mauve"
                : "text-subtext0 hover:text-text"
            }`}
          >
            <MoreHorizontal size={20} />
            <span className="mt-0.5">Mehr</span>
          </button>
        </div>
      </nav>
    </>
  );
}
