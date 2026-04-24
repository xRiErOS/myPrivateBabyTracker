/** Plugin management page — toggle optional plugins on/off. */

import { useState } from "react";
import { ChevronDown, ChevronUp, Repeat } from "lucide-react";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { PLUGINS } from "../lib/pluginRegistry";
import { isPluginEnabled, togglePlugin, isVisibleOnDashboard, toggleDashboardVisibility, getWidgetOrder, moveWidget } from "../lib/pluginConfig";

export default function PluginConfigPage() {
  // Force re-render after toggle
  const [, setTick] = useState(0);

  function handleToggle(key: string) {
    togglePlugin(key);
    setTick((t) => t + 1);
  }

  function handleDashboardToggle(key: string) {
    toggleDashboardVisibility(key);
    setTick((t) => t + 1);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Plugins" />

      <p className="font-body text-sm text-subtext0">
        Aktiviere oder deaktiviere optionale Module. Basis-Plugins sind immer aktiv.
      </p>

      <div className="space-y-2">
        {PLUGINS.map((plugin) => {
          const Icon = plugin.icon;
          const enabled = isPluginEnabled(plugin.key);
          const dashboardVisible = isVisibleOnDashboard(plugin.key);

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
                <div className="flex items-center gap-3 shrink-0">
                  {/* Dashboard visibility toggle(s) */}
                  {plugin.key === "todo" ? (
                    <>
                      {/* ToDo dashboard toggle */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-body text-[10px] text-subtext0">ToDos</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={dashboardVisible}
                          aria-label={`ToDos auf Dashboard ${dashboardVisible ? "ausblenden" : "anzeigen"}`}
                          disabled={!enabled}
                          onClick={() => handleDashboardToggle("todo")}
                          className={`relative inline-flex h-6 w-[40px] shrink-0 items-center rounded-full transition-colors ${
                            dashboardVisible ? "bg-sapphire" : "bg-surface2"
                          } ${!enabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                              dashboardVisible ? "translate-x-[20px]" : "translate-x-[2px]"
                            }`}
                          />
                        </button>
                      </div>
                      {/* Habits dashboard toggle */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-body text-[10px] text-subtext0">Habits</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isVisibleOnDashboard("habits")}
                          aria-label={`Habits auf Dashboard ${isVisibleOnDashboard("habits") ? "ausblenden" : "anzeigen"}`}
                          disabled={!enabled}
                          onClick={() => handleDashboardToggle("habits")}
                          className={`relative inline-flex h-6 w-[40px] shrink-0 items-center rounded-full transition-colors ${
                            isVisibleOnDashboard("habits") ? "bg-sapphire" : "bg-surface2"
                          } ${!enabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                              isVisibleOnDashboard("habits") ? "translate-x-[20px]" : "translate-x-[2px]"
                            }`}
                          />
                        </button>
                      </div>
                    </>
                  ) : (
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-body text-[10px] text-subtext0">Dashboard</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={dashboardVisible}
                      aria-label={`${plugin.label} auf Dashboard ${dashboardVisible ? "ausblenden" : "anzeigen"}`}
                      disabled={!enabled}
                      onClick={() => handleDashboardToggle(plugin.key)}
                      className={`relative inline-flex h-6 w-[40px] shrink-0 items-center rounded-full transition-colors ${
                        dashboardVisible ? "bg-sapphire" : "bg-surface2"
                      } ${!enabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                          dashboardVisible ? "translate-x-[20px]" : "translate-x-[2px]"
                        }`}
                      />
                    </button>
                  </div>
                  )}
                  {/* Plugin active toggle */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-body text-[10px] text-subtext0">Aktiv</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`${plugin.label} ${enabled ? "deaktivieren" : "aktivieren"}`}
                      disabled={plugin.isBase}
                      onClick={() => handleToggle(plugin.key)}
                      className={`relative inline-flex h-6 w-[40px] shrink-0 items-center rounded-full transition-colors ${
                        enabled ? "bg-green" : "bg-surface2"
                      } ${plugin.isBase ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                          enabled ? "translate-x-[20px]" : "translate-x-[2px]"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Widget order section */}
      <h3 className="font-headline text-base font-semibold mt-6">Widget-Reihenfolge</h3>
      <p className="font-body text-sm text-subtext0">
        Reihenfolge der Widgets im Dashboard-Grid anpassen.
      </p>
      <div className="space-y-1">
        {getWidgetOrder().map((key, idx, arr) => {
          // Standalone widgets not in PLUGINS registry
          const standaloneWidgets: Record<string, { label: string; icon: typeof Repeat }> = {
            habits: { label: "Habits", icon: Repeat },
          };
          const standalone = standaloneWidgets[key];
          const plugin = PLUGINS.find((p) => p.key === key);
          if (!plugin && !standalone) return null;
          const Icon = standalone ? standalone.icon : plugin!.icon;
          const label = standalone ? standalone.label : plugin!.label;
          return (
            <div key={key} className="flex items-center gap-2 bg-surface0 rounded-lg px-3 py-2">
              <Icon className="h-4 w-4 text-mauve shrink-0" />
              <span className="font-label text-sm text-text flex-1">{label}</span>
              <button
                onClick={() => { moveWidget(key, "up"); setTick((t) => t + 1); }}
                disabled={idx === 0}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-subtext0 hover:text-text disabled:opacity-30 transition-colors"
                aria-label="Nach oben"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => { moveWidget(key, "down"); setTick((t) => t + 1); }}
                disabled={idx === arr.length - 1}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-subtext0 hover:text-text disabled:opacity-30 transition-colors"
                aria-label="Nach unten"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
