/** Desktop sidebar navigation — hidden on mobile. */

import { CheckSquare, Droplets, LayoutDashboard, Moon, Pill, Scale, Settings, Thermometer, Utensils } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sleep", icon: Moon, label: "Schlaf" },
  { to: "/feeding", icon: Utensils, label: "Mahlzeiten" },
  { to: "/diaper", icon: Droplets, label: "Windeln" },
  { to: "/temperature", icon: Thermometer, label: "Temperatur" },
  { to: "/weight", icon: Scale, label: "Gewicht" },
  { to: "/medication", icon: Pill, label: "Medikamente" },
  { to: "/todo", icon: CheckSquare, label: "ToDo" },
  { to: "/admin", icon: Settings, label: "Verwaltung" },
] as const;

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 bg-surface0 min-h-screen py-6 px-3 border-r border-surface1">
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
