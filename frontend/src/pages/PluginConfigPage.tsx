/** Plugin management page — toggle optional plugins on/off. */

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PLUGINS } from "../lib/pluginRegistry";
import { isPluginEnabled, togglePlugin } from "../lib/pluginConfig";

export default function PluginConfigPage() {
  const navigate = useNavigate();
  // Force re-render after toggle
  const [, setTick] = useState(0);

  function handleToggle(key: string) {
    togglePlugin(key);
    setTick((t) => t + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/admin")}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-surface1 text-subtext0"
          aria-label="Zurueck"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-headline text-lg font-semibold">Plugins</h2>
      </div>

      <p className="font-body text-sm text-subtext0">
        Aktiviere oder deaktiviere optionale Module. Basis-Plugins sind immer aktiv.
      </p>

      <div className="space-y-2">
        {PLUGINS.map((plugin) => {
          const Icon = plugin.icon;
          const enabled = isPluginEnabled(plugin.key);

          return (
            <Card key={plugin.key} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-5 w-5 text-mauve shrink-0" />
                  <div className="min-w-0">
                    <span className="font-label text-sm font-medium text-text block">
                      {plugin.label}
                    </span>
                    {plugin.isBase && (
                      <span className="font-body text-xs text-subtext0">
                        Basis-Plugin — immer aktiv
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${plugin.label} ${enabled ? "deaktivieren" : "aktivieren"}`}
                  disabled={plugin.isBase}
                  onClick={() => handleToggle(plugin.key)}
                  className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors ${
                    enabled ? "bg-green" : "bg-surface2"
                  } ${plugin.isBase ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span
                    className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                      enabled ? "translate-x-[26px]" : "translate-x-[2px]"
                    }`}
                  />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
