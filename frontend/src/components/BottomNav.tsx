/** Adaptive bottom navigation — 4 favorites + "Mehr" menu for additional items.

Touch targets: min 44px. Expands with new plugins automatically.
*/

import { useState } from "react";
import {
  Baby,
  ClipboardList,
  Droplets,
  LayoutDashboard,
  MoreHorizontal,
  Moon,
  Pill,
  Scale,
  Thermometer,
  Utensils,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const ALL_ITEMS: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sleep", icon: Moon, label: "Schlaf" },
  { to: "/feeding", icon: Utensils, label: "Mahlzeiten" },
  { to: "/diaper", icon: Droplets, label: "Windeln" },
  { to: "/temperature", icon: Thermometer, label: "Temperatur" },
  { to: "/weight", icon: Scale, label: "Gewicht" },
  { to: "/medication", icon: Pill, label: "Medikamente" },
  { to: "/medication-masters", icon: ClipboardList, label: "Stammdaten" },
  { to: "/children", icon: Baby, label: "Kinder" },
];

const FAVORITES = ALL_ITEMS.slice(0, 4); // Dashboard, Schlaf, Mahlzeiten, Windeln
const MORE_ITEMS = ALL_ITEMS.slice(4);

export function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const location = useLocation();

  // Check if current route is in the "more" section
  const isMoreActive = MORE_ITEMS.some(
    (item) => location.pathname === item.to,
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
