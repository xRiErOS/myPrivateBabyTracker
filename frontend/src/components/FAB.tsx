/** Floating Action Button (FAB) — mobile only, opens Quick-Action-Menü.

Position: fixed bottom-right, above BottomNav.
Only visible on mobile (< md breakpoint).

MBT-182: Radial-Menü mit bis zu 4 konfigurierbaren Slots.
- Items werden im Quarter-Circle (270°-360°, also oben links vom FAB) angeordnet.
- Slot 4 darf leer sein → dann werden nur 3 Items gerendert.
- Animation: Stagger 35ms, max 240ms total, ease-out, 60fps tauglich
  (transform/opacity only, kein Layout-Shift).
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

// Radius des Bogens in Pixel — 90px ergibt komfortable 44px-Touch-Targets
// ohne Überlappung bei 4 Slots im Quarter-Circle.
const RADIAL_RADIUS = 96;

/**
 * Bestimmt für n Items (1–4) die Winkel (in Grad) auf einem Quarter-Circle.
 * Der FAB sitzt unten rechts — Items werden oben links davon platziert.
 * 180° = links, 270° = oben (CSS-Koordinaten: x = cos(angle)·r, y = sin(angle)·r,
 * y wird negiert, da Bildschirm-Y nach unten zeigt).
 *
 * - 1 Item:  225° (diagonal oben-links)
 * - 2 Items: 200°, 250°
 * - 3 Items: 190°, 225°, 260°
 * - 4 Items: 185°, 215°, 245°, 275°  (gleichmäßig zwischen 180° und 280°)
 */
function getRadialAngles(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [225];
  if (count === 2) return [200, 250];
  if (count === 3) return [190, 225, 260];
  // 4 Items
  return [185, 215, 245, 275];
}

function polarToCartesian(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  // CSS: y wächst nach unten. Polar mit 0° = rechts, 90° = oben → y negieren.
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
  };
}

export function FAB() {
  const [open, setOpen] = useState(false);
  const [allPluginsOpen, setAllPluginsOpen] = useState(false);
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const quickActionKeys = getQuickActions();
  const actions = quickActionKeys
    .map((key) => ALL_ACTIONS.find((a) => a.key === key))
    .filter(Boolean) as ActionDef[];

  // "Weitere"-Button zählt als zusätzlicher Slot im Radial-Menü.
  // Maximal 4 Quick-Actions + "Weitere" = 5 Items im Bogen.
  const radialItemCount = actions.length + 1; // +1 für "Weitere"
  const angles = getRadialAngles(Math.min(radialItemCount, 4));
  // Falls 5 Items (4 Actions + Weitere): nutze einen breiteren Bogen.
  const fiveAngles = [180, 205, 230, 255, 280];
  const finalAngles = radialItemCount === 5 ? fiveAngles : angles;

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

  // Item-Liste in Render-Reihenfolge: erst Quick-Actions, dann "Weitere".
  const radialItems: Array<{
    key: string;
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    variant: "primary" | "secondary";
  }> = [
    ...actions.map((a) => ({
      key: a.key,
      label: a.label,
      icon: a.icon,
      onClick: () => handleAction(a.route),
      variant: "primary" as const,
    })),
    {
      key: "__more__",
      label: "Weitere",
      icon: Grid2X2,
      onClick: () => {
        setOpen(false);
        setAllPluginsOpen(true);
      },
      variant: "secondary" as const,
    },
  ];

  return (
    <>
      {/* Backdrop — close on click outside */}
      {(open || allPluginsOpen) && (
        <div
          className={`fixed inset-0 z-40 md:hidden transition-opacity duration-150 ${
            open ? "bg-ground/30" : ""
          }`}
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
                aria-label="Schließen"
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
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] right-4 z-50 md:hidden">
        {/* Radial menu items — absolut positioniert relativ zum FAB-Mittelpunkt */}
        {open && (
          <div
            className="absolute bottom-0 right-0 w-14 h-14 pointer-events-none"
            role="menu"
            aria-label="Quick Actions"
          >
            {radialItems.map((item, idx) => {
              const angle = finalAngles[idx];
              if (angle === undefined) return null;
              const { x, y } = polarToCartesian(angle, RADIAL_RADIUS);
              const Icon = item.icon;
              const delayMs = idx * 35;
              // Kreisförmige Buttons (h-12 w-12 = 48px ≥ 44px Touch-Target).
              const isPrimary = item.variant === "primary";
              return (
                <button
                  key={item.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick();
                  }}
                  disabled={!activeChild && isPrimary}
                  className={`pointer-events-auto absolute h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
                    isPrimary
                      ? "bg-surface0 border border-surface1 text-peach hover:bg-surface1"
                      : "bg-surface1 border border-surface2 text-overlay0 hover:bg-surface2"
                  }`}
                  style={{
                    // Mittelpunkt des FAB ist die Origin: 28px (FAB ist 56px = h-14).
                    // Wir verschieben das Item-Zentrum (24px = h-12 / 2) so, dass das
                    // Item-Zentrum bei (FAB-Center + (x, -y)) liegt.
                    left: `calc(50% - 24px + ${x}px)`,
                    top: `calc(50% - 24px - ${y}px)`,
                    animation: `fabRadialIn 220ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms both`,
                    willChange: "transform, opacity",
                  }}
                  aria-label={item.label}
                  title={item.label}
                  role="menuitem"
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        )}

        {/* Main FAB button */}
        <button
          data-tutorial="fab"
          onClick={() => {
            setAllPluginsOpen(false);
            setOpen(!open);
          }}
          className={`relative h-14 w-14 rounded-full bg-peach shadow-lg flex items-center justify-center text-ground transition-transform active:scale-95 ${open ? "rotate-45" : ""}`}
          style={{ transition: "transform 200ms ease" }}
          aria-label={open ? "Menü schließen" : "Neue Eingabe"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      <style>{`
        @keyframes fabRadialIn {
          from {
            opacity: 0;
            transform: scale(0.4) translate(20px, 20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translate(0, 0);
          }
        }
      `}</style>
    </>
  );
}
