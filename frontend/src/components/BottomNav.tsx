/** Mobile bottom navigation — 44px min touch targets. */

import { Baby, Droplets, LayoutDashboard, Moon, Utensils } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sleep", icon: Moon, label: "Schlaf" },
  { to: "/feeding", icon: Utensils, label: "Mahlzeiten" },
  { to: "/diaper", icon: Droplets, label: "Windeln" },
  { to: "/children", icon: Baby, label: "Kinder" },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface0 border-t border-surface1 px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map(({ to, icon: Icon, label }) => (
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
      </div>
    </nav>
  );
}
