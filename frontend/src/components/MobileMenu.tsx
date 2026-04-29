/** Mobile navigation drawer — opened from burger button in Header.

Shows all enabled plugins + Verwaltung in a slide-down panel, grouped
thematically (MBT-181). Only visible on mobile (< md). Closes on navigation.
*/

import { useEffect, useState } from "react";
import { Home, Settings, User, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isPluginEnabled } from "../lib/pluginConfig";
import {
  PLUGINS,
  PLUGIN_CATEGORIES,
  type PluginCategory,
} from "../lib/pluginRegistry";

function useEnabledPlugins() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return PLUGINS.filter((p) => p.route && isPluginEnabled(p.key));
}

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const location = useLocation();
  const enabled = useEnabledPlugins();
  const { t: tc } = useTranslation("common");

  // Close on navigation
  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const grouped: Record<PluginCategory, typeof enabled> = {
    tracking: enabled.filter((p) => p.category === "tracking"),
    development: enabled.filter((p) => p.category === "development"),
    organization: enabled.filter((p) => p.category === "organization"),
  };

  const tileClass = (isActive: boolean) =>
    `flex flex-col items-center justify-center min-h-[60px] rounded-xl py-2 px-1 text-xs font-label transition-colors ${
      isActive
        ? "bg-mauve/15 text-mauve font-medium"
        : "text-subtext0 hover:bg-surface1 hover:text-text"
    }`;

  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-crust/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      <div className="fixed top-[52px] left-0 right-0 z-[56] bg-surface0 border-b border-surface1 rounded-b-2xl px-4 py-4 md:hidden animate-fade-in max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="font-headline text-sm font-semibold text-text">
            {tc("navigation")}
          </span>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        {/* Home */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <NavLink to="/" end className={({ isActive }) => tileClass(isActive)}>
            <Home size={22} />
            <span className="mt-1">{tc("nav.dashboard")}</span>
          </NavLink>
        </div>

        {PLUGIN_CATEGORIES.map((category) => {
          const items = grouped[category];
          if (items.length === 0) return null;
          return (
            <div key={category} className="mb-3">
              <p className="font-label text-[10px] font-semibold text-subtext0 uppercase tracking-wide mb-1.5">
                {tc(`nav.group.${category}`)}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {items.map(({ key, route, icon: Icon }) => (
                  <NavLink
                    key={key}
                    to={route}
                    data-tutorial={`menu-${key}`}
                    className={({ isActive }) => tileClass(isActive)}
                  >
                    <Icon size={22} />
                    <span className="mt-1">{tc(`nav.${key}`)}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}

        {/* Verwaltung */}
        <div className="mb-1">
          <p className="font-label text-[10px] font-semibold text-subtext0 uppercase tracking-wide mb-1.5">
            {tc("nav.group.admin")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <NavLink
              to="/profile"
              data-tutorial="menu-profile"
              className={({ isActive }) => tileClass(isActive)}
            >
              <User size={22} />
              <span className="mt-1">{tc("nav.profile")}</span>
            </NavLink>
            <NavLink
              to="/admin"
              data-tutorial="menu-admin"
              className={({ isActive }) => tileClass(isActive)}
            >
              <Settings size={22} />
              <span className="mt-1">{tc("nav.admin")}</span>
            </NavLink>
          </div>
        </div>
      </div>
    </>
  );
}
