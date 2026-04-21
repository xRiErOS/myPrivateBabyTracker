/** Admin hub page — navigation tiles for management pages + Quick Actions config. */

import { useState } from "react";
import { AlertTriangle, Baby, ClipboardList, Puzzle, Settings, Tags, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PLUGINS } from "../lib/pluginRegistry";
import { getQuickActions, setQuickActions } from "../lib/quickActions";
import { isBreastfeedingEnabled, setBreastfeedingEnabled } from "../lib/breastfeedingMode";

interface AdminTile {
  to: string;
  icon: React.ElementType;
  label: string;
  description: string;
}

const TILES: AdminTile[] = [
  {
    to: "/admin/children",
    icon: Baby,
    label: "Kinder",
    description: "Kinder verwalten, Geburtsdaten, aktives Kind",
  },
  {
    to: "/admin/medication-masters",
    icon: ClipboardList,
    label: "Medikamentenliste",
    description: "Stammdaten fuer Medikamenten-Dropdown",
  },
  {
    to: "/admin/tags",
    icon: Tags,
    label: "Tags",
    description: "Tags verwalten, Farben, umbenennen",
  },
  {
    to: "/admin/alerts",
    icon: AlertTriangle,
    label: "Warnhinweise",
    description: "Alarme und Schwellwerte konfigurieren",
  },
  {
    to: "/admin/plugins",
    icon: Puzzle,
    label: "Plugins",
    description: "Module aktivieren/deaktivieren",
  },
];

const FAVORITE_LABELS = ["Favorit 1", "Favorit 2", "Favorit 3"];

export default function AdminPage() {
  const navigate = useNavigate();
  const [quickActions, setQuickActionsState] = useState(getQuickActions);
  const [breastfeedingEnabled, setBreastfeedingEnabledState] = useState(isBreastfeedingEnabled);

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
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-mauve" />
        <h2 className="font-headline text-lg font-semibold">Verwaltung</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map(({ to, icon: Icon, label, description }) => (
          <Card
            key={to}
            className="flex flex-col items-center gap-2 p-4 cursor-pointer active:bg-surface1 transition-colors"
            onClick={() => navigate(to)}
          >
            <Icon className="h-8 w-8 text-mauve" />
            <span className="font-label text-sm font-medium text-text text-center">
              {label}
            </span>
            <span className="font-body text-xs text-subtext0 text-center">
              {description}
            </span>
          </Card>
        ))}
      </div>

      {/* Quick Actions Configuration */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-peach" />
          <h3 className="font-headline text-base font-semibold text-text">Quick Actions</h3>
        </div>
        <p className="font-body text-xs text-subtext0">
          Konfiguriere die 3 Schnellzugriff-Buttons auf dem Dashboard.
        </p>
        <div className="space-y-2">
          {FAVORITE_LABELS.map((label, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <label className="font-label text-sm text-subtext0 w-20 shrink-0">
                {label}
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
            <h3 className="font-headline text-base font-semibold text-text">Stillmodus</h3>
            <p className="font-body text-xs text-subtext0 mt-1">
              Zeigt die zuletzt gestillte Seite auf dem Dashboard. Deaktiviere dies, wenn du nicht stillst.
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
      </Card>
    </div>
  );
}
