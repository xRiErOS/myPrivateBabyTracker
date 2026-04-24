/** Floating Action Button (FAB) — mobile only, opens Quick-Action-Menü.

Position: fixed bottom-right, above BottomNav.
Only visible on mobile (< md breakpoint).
Animation: scale-up beim Öffnen des Menüs.
*/

import { useState } from "react";
import { Grid2X2, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Droplets, Moon, Utensils, Pill, Thermometer, Scale, CheckSquare, Activity, Timer } from "lucide-react";
import { getQuickActions } from "../lib/quickActions";
import { PLUGINS } from "../lib/pluginRegistry";
import { isPluginEnabled } from "../lib/pluginConfig";
import type { LucideIcon } from "lucide-react";
import { useActiveChild } from "../context/ChildContext";

interface ActionDef {
  key: string;
  label: string;
  icon: LucideIcon;
  route: string;
}

const ALL_ACTIONS: ActionDef[] = [
  { key: "sleep", label: "Schlaf", icon: Moon, route: "/sleep?new=1" },
  { key: "feeding", label: "Mahlzeit", icon: Utensils, route: "/feeding?new=1" },
  { key: "diaper", label: "Windel", icon: Droplets, route: "/diaper?new=1" },
  { key: "temperature", label: "Temperatur", icon: Thermometer, route: "/temperature?new=1" },
  { key: "weight", label: "Gewicht", icon: Scale, route: "/weight?new=1" },
  { key: "medication", label: "Medikament", icon: Pill, route: "/medication?new=1" },
  { key: "health", label: "Wohlbefinden", icon: Activity, route: "/health?new=1" },
  { key: "todo", label: "Aufgabe", icon: CheckSquare, route: "/todo?new=1" },
  { key: "tummytime", label: "Bauchlage", icon: Timer, route: "/tummy-time?new=1" },
];

export function FAB() {
  const [open, setOpen] = useState(false);
  const [allPluginsOpen, setAllPluginsOpen] = useState(false);
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const quickActionKeys = getQuickActions();
  const actions = quickActionKeys
    .map((key) => ALL_ACTIONS.find((a) => a.key === key))
    .filter(Boolean) as ActionDef[];

  // All enabled plugins with a route (for the "Weitere" modal)
  const allPlugins = PLUGINS.filter((p) => p.route && isPluginEnabled(p.key));

  function handleAction(route: string) {
    setOpen(false);
    setAllPluginsOpen(false);
    navigate(route);
  }

  function handleClose() {
    setOpen(false);
    setAllPluginsOpen(false);
  }

  return (
    <>
      {/* Backdrop — close on click outside */}
      {(open || allPluginsOpen) && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* "Weitere" plugins modal — full plugin list */}
      {allPluginsOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:hidden"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-ground/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-surface0 rounded-2xl p-4 space-y-1 animate-fade-in max-h-[80vh] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline text-base font-semibold text-text">
                Neuer Eintrag
              </h3>
              <button
                onClick={handleClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-surface1 text-subtext0"
                aria-label="Schliessen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {allPlugins.map((plugin) => {
              const Icon = plugin.icon;
              return (
                <button
                  key={plugin.key}
                  onClick={() => handleAction(`${plugin.route}?new=1`)}
                  disabled={!activeChild}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-lg text-text hover:bg-surface1 active:bg-surface1 transition-colors disabled:opacity-50"
                >
                  <Icon className="h-5 w-5 text-subtext0" />
                  <span className="font-label text-sm">{plugin.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FAB container — fixed bottom-right, above BottomNav */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] right-4 z-50 flex flex-col items-end gap-3 md:hidden">
        {/* Quick action items (animate in when open) */}
        {open && (
          <div
            className="flex flex-col items-end gap-2 origin-bottom-right"
            style={{ animation: "fabMenuIn 150ms ease-out" }}
          >
            {/* "Weitere" button — top position, opens full plugin modal */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                setAllPluginsOpen(true);
              }}
              className="flex items-center gap-3 rounded-full bg-surface1 shadow-lg border border-surface2 px-4 py-2.5 min-h-[44px] text-sm font-medium text-subtext0 hover:bg-surface2 transition-colors"
            >
              <span className="font-label">Weitere</span>
              <div className="h-9 w-9 rounded-full bg-overlay0/20 flex items-center justify-center">
                <Grid2X2 className="h-5 w-5 text-overlay0" />
              </div>
            </button>

            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  onClick={() => handleAction(action.route)}
                  disabled={!activeChild}
                  className="flex items-center gap-3 rounded-full bg-surface0 shadow-lg border border-surface1 px-4 py-2.5 min-h-[44px] text-sm font-medium text-text hover:bg-surface1 transition-colors disabled:opacity-50"
                >
                  <span className="font-label">{action.label}</span>
                  <div className="h-9 w-9 rounded-full bg-peach/15 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-peach" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Main FAB button */}
        <button
          onClick={() => {
            setAllPluginsOpen(false);
            setOpen(!open);
          }}
          className={`h-14 w-14 rounded-full bg-peach shadow-lg flex items-center justify-center text-ground transition-transform active:scale-95 ${open ? "rotate-45" : ""}`}
          style={{ transition: "transform 200ms ease" }}
          aria-label={open ? "Menü schließen" : "Neue Eingabe"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      <style>{`
        @keyframes fabMenuIn {
          from { opacity: 0; transform: scale(0.85) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
