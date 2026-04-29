/** Desktop sidebar navigation — hidden on mobile. Dynamically filters by enabled plugins.
 *
 * Items are grouped thematically (MBT-181):
 * - Home (Dashboard)
 * - Tracking (Tagesablauf, Pflege, Gesundheit)
 * - Entwicklung (Meilensteine, U-Untersuchungen)
 * - Organisation (Tasks, Notizen, Tags)
 * - Verwaltung
 */

import { useEffect, useState } from "react";
import { Home, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isPluginEnabled } from "../lib/pluginConfig";
import { PLUGINS, PLUGIN_CATEGORIES, type PluginCategory } from "../lib/pluginRegistry";

export function Sidebar() {
  const [, setTick] = useState(0);
  const { t: tc } = useTranslation("common");

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const enabledPlugins = PLUGINS.filter(
    (p) => p.route && isPluginEnabled(p.key),
  );

  const grouped: Record<PluginCategory, typeof enabledPlugins> = {
    tracking: enabledPlugins.filter((p) => p.category === "tracking"),
    development: enabledPlugins.filter((p) => p.category === "development"),
    organization: enabledPlugins.filter((p) => p.category === "organization"),
  };

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 min-h-[44px] px-3 py-2.5 rounded-[8px] font-label text-sm font-medium transition-colors ${
      isActive
        ? "bg-mauve/10 text-mauve"
        : "text-subtext0 hover:bg-surface1 hover:text-text"
    }`;

  return (
    <aside className="hidden md:flex flex-col w-56 bg-surface0 fixed top-[52px] left-0 bottom-0 py-6 px-3 border-r border-surface1 overflow-y-auto">
      <nav className="flex flex-col gap-1">
        {/* Home */}
        <NavLink to="/" end className={({ isActive }) => linkClass(isActive)}>
          <Home size={20} />
          <span>{tc("nav.dashboard")}</span>
        </NavLink>

        {/* Plugin groups */}
        {PLUGIN_CATEGORIES.map((category) => {
          const items = grouped[category];
          if (items.length === 0) return null;
          return (
            <div key={category} className="mt-3">
              <p className="px-3 pt-2 pb-1 font-label text-[10px] font-semibold text-subtext0 uppercase tracking-wide border-t border-surface1">
                {tc(`nav.group.${category}`)}
              </p>
              {items.map(({ key, route, icon: Icon }) => (
                <NavLink
                  key={key}
                  to={route}
                  data-tutorial={`sidebar-${key}`}
                  className={({ isActive }) => linkClass(isActive)}
                >
                  <Icon size={20} />
                  <span>{tc(`nav.${key}`)}</span>
                </NavLink>
              ))}
            </div>
          );
        })}

        {/* Verwaltung */}
        <div className="mt-3">
          <p className="px-3 pt-2 pb-1 font-label text-[10px] font-semibold text-subtext0 uppercase tracking-wide border-t border-surface1">
            {tc("nav.group.admin")}
          </p>
          <NavLink
            to="/admin"
            data-tutorial="sidebar-admin"
            className={({ isActive }) => linkClass(isActive)}
          >
            <Settings size={20} />
            <span>{tc("nav.admin")}</span>
          </NavLink>
        </div>
      </nav>
    </aside>
  );
}
