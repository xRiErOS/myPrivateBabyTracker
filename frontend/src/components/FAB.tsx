/** Floating Action Button (FAB) — mobile only, opens Quick-Action-Menü.

Position: fixed bottom-right, above BottomNav.
Only visible on mobile (< md breakpoint).

MBT-182: Radial-Menü mit bis zu 4 konfigurierbaren Slots + "Weitere".
- Items werden im Quarter-Circle (90°–180°, oben links vom FAB) angeordnet.
- Slot 4 darf leer sein → dann werden nur 3 Items + "Weitere" gerendert.
- Animation: Stagger 35ms, max 240ms total, ease-out, 60fps tauglich
  (transform/opacity only, kein Layout-Shift).

MBT-231 R2: Adaptive Geometrie. Radius und Spread skalieren mit
der Item-Anzahl, damit benachbarte Buttons (48px) niemals überlappen
(min. Sehne 56px = 8px sichtbarer Gap). Berechnung:
  chord(r, Δ) = 2·r·sin(Δ/2) mit Δ = spread/(n-1) ≥ 56px.
Ergebnis-Tabelle (Spread / Radius):
  n=1: 0°  / 92px   (Diagonale 135°)
  n=2: 50° / 96px   (110°, 160°)
  n=3: 70° / 96px   (100°, 135°, 170°)
  n=4: 80° / 125px  (95°, 121.66°, 148.33°, 175°)
  n=5: 90° / 145px  (90°, 112.5°, 135°, 157.5°, 180°)
Viewport-Cap: r ≤ 240px (passt auf iPhone SE 320px Breite).
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

// Mindestabstand (Mittelpunkt-zu-Mittelpunkt) zwischen benachbarten 48px-Buttons
// ist 56px = 48px Diameter + 8px sichtbarer Gap. Die Radius-Werte unten
// sind so gewählt, dass die Sehne stets ≥ 56px ist.
// Maximaler Radius, damit auf iPhone SE (320px) der linkeste Item-Rand
// noch ≥ 8px vom Bildschirmrand bleibt (FAB-Mitte bei x=276 → 276 - r - 24 ≥ 8).
const RADIAL_MAX_RADIUS = 240;

/**
 * Liefert den Radius (px) für n Items so, dass die Sehne zwischen
 * benachbarten Buttons ≥ MIN_CHORD ist. Werte sind aus
 *   r ≥ (MIN_CHORD/2) / sin(Δ/2),  Δ = spread/(n-1)
 * abgeleitet und auf 5px aufgerundet.
 */
function getRadialRadius(count: number): number {
  let r: number;
  if (count <= 1) r = 92;
  else if (count === 2) r = 96; // spread 50°, chord 81px
  else if (count === 3) r = 96; // spread 70°, chord 57.7px
  else if (count === 4) r = 125; // spread 80°, chord 57.7px
  else r = 145; // n>=5: spread 90°, chord 56.6px
  return Math.min(r, RADIAL_MAX_RADIUS);
}

/**
 * Bestimmt für n Items (1–5) die Winkel (in Grad) auf einem Quarter-Circle.
 * Der FAB sitzt unten rechts — Items werden oben links davon platziert.
 * Konvention: 0° = rechts, 90° = oben, 180° = links (mathematische Polar­koordinaten).
 * Render-Code (top: 50% - 24px - y) negiert y wieder, daher liefert sin>0 → Item nach oben.
 * Der nutzbare Bogen für „oben-links vom FAB" liegt zwischen 90° und 180°.
 *
 * Spread skaliert mit Item-Anzahl, damit Sehne ≥ 56px:
 * - 1 Item:  135°
 * - 2 Items: 110°, 160°                          (spread 50°)
 * - 3 Items: 100°, 135°, 170°                    (spread 70°)
 * - 4 Items: 95°, 121.66°, 148.33°, 175°         (spread 80°)
 * - 5 Items: 90°, 112.5°, 135°, 157.5°, 180°     (spread 90°)
 */
function getRadialAngles(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [135];
  if (count === 2) return [110, 160];
  if (count === 3) return [100, 135, 170];
  if (count === 4) {
    const start = 95;
    const spread = 80;
    const step = spread / 3;
    return [start, start + step, start + 2 * step, start + spread];
  }
  // n >= 5 — gleichmäßig über 90°–180°
  const start = 90;
  const spread = 90;
  const n = Math.min(count, 5);
  const step = spread / (n - 1);
  return Array.from({ length: n }, (_, i) => start + i * step);
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
  const radialItemCount = Math.min(actions.length + 1, 5); // +1 für "Weitere"
  const finalAngles = getRadialAngles(radialItemCount);
  const radialRadius = getRadialRadius(radialItemCount);

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
              const { x, y } = polarToCartesian(angle, radialRadius);
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
