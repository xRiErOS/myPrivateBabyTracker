/** Admin hub page — navigation tiles for management pages + Quick Actions config. */

import { useState } from "react";
import { AlertTriangle, Baby, ClipboardList, FileText, Image, KeyRound, Puzzle, Shield, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { PLUGINS } from "../lib/pluginRegistry";
import { getQuickActions, setQuickActions } from "../lib/quickActions";
import { isBreastfeedingEnabled, setBreastfeedingEnabled, isFeedingHybrid, setFeedingHybrid } from "../lib/breastfeedingMode";

interface AdminTile {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  descKey: string;
}

const TILES: AdminTile[] = [
  { to: "/admin/children", icon: Baby, labelKey: "tiles.children", descKey: "tiles.children_desc" },
  { to: "/admin/medication-masters", icon: ClipboardList, labelKey: "tiles.medication_masters", descKey: "tiles.medication_masters_desc" },
  { to: "/admin/alerts", icon: AlertTriangle, labelKey: "tiles.alerts", descKey: "tiles.alerts_desc" },
  { to: "/admin/plugins", icon: Puzzle, labelKey: "tiles.plugins", descKey: "tiles.plugins_desc" },
  { to: "/admin/api-keys", icon: KeyRound, labelKey: "tiles.api_keys", descKey: "tiles.api_keys_desc" },
  { to: "/admin/auth", icon: Shield, labelKey: "tiles.auth", descKey: "tiles.auth_desc" },
  { to: "/admin/users", icon: Users, labelKey: "tiles.users", descKey: "tiles.users_desc" },
  { to: "/admin/changelog", icon: FileText, labelKey: "tiles.changelog", descKey: "tiles.changelog_desc" },
  { to: "/admin/media", icon: Image, labelKey: "tiles.media", descKey: "tiles.media_desc" },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const [quickActions, setQuickActionsState] = useState(getQuickActions);
  const [breastfeedingEnabled, setBreastfeedingEnabledState] = useState(isBreastfeedingEnabled);
  const [hybridEnabled, setHybridEnabledState] = useState(isFeedingHybrid);

  function handleQuickActionChange(index: number, value: string) {
    const next = [...quickActions];
    next[index] = value;
    setQuickActionsState(next);
    setQuickActions(next);
  }

  function handleBreastfeedingToggle() {
    const next = !breastfeedingEnabled;
    setBreastfeedingEnabledState(next);
    setBreastfeedingEnabled(next);
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} />

      <div className="grid grid-cols-2 gap-3">
        {TILES.map(({ to, icon: Icon, labelKey, descKey }) => (
          <Card
            key={to}
            className="flex flex-col items-center gap-2 p-4 cursor-pointer active:bg-surface1 transition-colors"
            onClick={() => navigate(to)}
          >
            <Icon className="h-8 w-8 text-mauve" />
            <span className="font-label text-sm font-medium text-text text-center">
              {t(labelKey)}
            </span>
            <span className="font-body text-xs text-subtext0 text-center">
              {t(descKey)}
            </span>
          </Card>
        ))}
      </div>

      {/* Quick Actions Configuration */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-peach" />
          <h3 className="font-headline text-base font-semibold text-text">{t("quick_actions.title")}</h3>
        </div>
        <p className="font-body text-xs text-subtext0">
          {t("quick_actions.description")}
        </p>
        <div className="space-y-2">
          {[1, 2, 3].map((num, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <label className="font-label text-sm text-subtext0 w-20 shrink-0">
                {t("quick_actions.favorite", { number: num })}
              </label>
              <select
                value={quickActions[idx]}
                onChange={(e) => handleQuickActionChange(idx, e.target.value)}
                className="flex-1 min-h-[44px] px-3 rounded-[8px] bg-surface0 text-text font-body text-base border border-surface2 focus:outline-none focus:ring-2 focus:ring-peach"
              >
                {PLUGINS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>

      {/* Breastfeeding Mode Toggle */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline text-base font-semibold text-text">{t("breastfeeding.title")}</h3>
            <p className="font-body text-xs text-subtext0 mt-1">
              {t("breastfeeding.description")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={breastfeedingEnabled}
            onClick={handleBreastfeedingToggle}
            className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors ${breastfeedingEnabled ? "bg-green" : "bg-surface2"}`}
            aria-label="Stillseiten-Tracking umschalten"
          >
            <span
              className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${breastfeedingEnabled ? "translate-x-[26px]" : "translate-x-[2px]"}`}
            />
          </button>
        </div>

        {breastfeedingEnabled && (
          <div className="flex items-center justify-between pt-3 border-t border-surface1">
            <div>
              <p className="font-label text-sm font-medium text-text">{t("breastfeeding.hybrid")}</p>
              <p className="font-body text-xs text-subtext0 mt-1">
                {t("breastfeeding.hybrid_desc")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hybridEnabled}
              onClick={() => {
                const next = !hybridEnabled;
                setHybridEnabledState(next);
                setFeedingHybrid(next);
              }}
              className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors ${hybridEnabled ? "bg-green" : "bg-surface2"}`}
              aria-label="Hybridmodus umschalten"
            >
              <span
                className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${hybridEnabled ? "translate-x-[26px]" : "translate-x-[2px]"}`}
              />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
