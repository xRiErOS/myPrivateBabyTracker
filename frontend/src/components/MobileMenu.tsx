/** Mobile navigation drawer — opened from burger button in Header.

MBT-210: Two-section layout:
  1. Tracking — all enabled tracking plugins, ordered by widget_order (Plugin
     Settings) for live single-source-of-truth ordering.
  2. Organisation & Verwaltung — development + organization plugins + Profil + Admin.

Only visible on mobile (< md). Closes on navigation.
*/

import { useEffect, useState } from "react";
import { Home, Settings, User, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getWidgetOrder, isPluginEnabled } from "../lib/pluginConfig";
import { PLUGINS, type PluginDef } from "../lib/pluginRegistry";

function useEnabledPlugins() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return PLUGINS.filter((p) => p.route && isPluginEnabled(p.key));
}

/** Order tracking plugins by the user-configured widget_order from Plugin
 *  Settings (Single Source of Truth). Plugins not present in widget_order keep
 *  their declaration order from PLUGINS as a stable fallback. */
function orderTrackingPlugins(plugins: PluginDef[]): PluginDef[] {
  const widgetOrder = getWidgetOrder();
  const orderIndex = new Map<string, number>();
  widgetOrder.forEach((key, idx) => orderIndex.set(key, idx));

  return [...plugins].sort((a, b) => {
    const ai = orderIndex.get(a.key);
    const bi = orderIndex.get(b.key);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    // Both unordered: keep PLUGINS declaration order
    return PLUGINS.indexOf(a) - PLUGINS.indexOf(b);
  });
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

  const trackingPlugins = orderTrackingPlugins(
    enabled.filter((p) => p.category === "tracking"),
  );
  // Organisation & Verwaltung = development + organization plugins (in
  // declaration order) + system entries (Profil, Admin).
  const orgPlugins = enabled.filter(
    (p) => p.category === "development" || p.category === "organization",
  );

  const tileClass = (isActive: boolean) =>
    `flex flex-col items-center justify-center min-h-[60px] rounded-xl py-2 px-1 text-xs font-label transition-colors ${
      isActive
        ? "bg-mauve/15 text-mauve font-medium"
        : "text-subtext0 hover:bg-surface1 hover:text-text"
    }`;

  const sectionLabelClass =
    "font-label text-[10px] font-semibold text-subtext0 uppercase tracking-wide mb-1.5";

  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-crust/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      <div className="fixed top-[52px] left-0 right-0 z-[56] bg-surface0 border-b border-surface1 rounded-b-2xl px-4 py-3 md:hidden animate-fade-in max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
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
        <div className="grid grid-cols-3 gap-2 mb-2">
          <NavLink to="/" end className={({ isActive }) => tileClass(isActive)}>
            <Home size={22} />
            <span className="mt-1">{tc("nav.dashboard")}</span>
          </NavLink>
        </div>

        {/* Section 1: Tracking */}
        {trackingPlugins.length > 0 && (
          <div className="mb-2 pt-2 border-t border-surface1">
            <p className={sectionLabelClass}>{tc("nav.group.tracking")}</p>
            <div className="grid grid-cols-3 gap-2">
              {trackingPlugins.map(({ key, route, icon: Icon }) => (
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
        )}

        {/* Section 2: Organisation & Verwaltung */}
        <div className="pt-2 border-t border-surface1">
          <p className={sectionLabelClass}>{tc("nav.group.org_admin")}</p>
          <div className="grid grid-cols-3 gap-2">
            {orgPlugins.map(({ key, route, icon: Icon }) => (
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
