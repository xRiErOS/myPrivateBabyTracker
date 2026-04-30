/** VAS-Slider (Visual Analog Scale) — 0–10 in 0.5er-Stufen.
 *
 * Catppuccin-Farbverlauf: green (0) → yellow → peach → red (10).
 * Touch-Target ≥44 px (Track-Höhe + Padding).
 */

import type { ChangeEvent } from "react";

interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  id?: string;
}

/** Catppuccin-Token für die Farb-Lookup je VAS-Stufe. */
function colorForValue(v: number): string {
  if (v <= 0) return "text-green";
  if (v < 3) return "text-green";
  if (v < 5) return "text-yellow";
  if (v < 7) return "text-peach";
  return "text-red";
}

function trackBgFor(v: number): string {
  // Hintergrundfarbe der gefüllten Strecke
  if (v < 3) return "var(--ctp-green, #40a02b)";
  if (v < 5) return "var(--ctp-yellow, #df8e1d)";
  if (v < 7) return "var(--ctp-peach, #fe640b)";
  return "var(--ctp-red, #d20f39)";
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 0.5,
  hint,
  id,
}: SliderProps) {
  const sliderId = id ?? `slider-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const pct = ((value - min) / (max - min)) * 100;

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    onChange(Number.isFinite(raw) ? raw : min);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label
          htmlFor={sliderId}
          className="font-label text-sm text-subtext0"
        >
          {label}
        </label>
        <span
          className={`font-label text-sm font-semibold tabular-nums ${colorForValue(value)}`}
          aria-live="polite"
        >
          {value.toFixed(1)}
        </span>
      </div>
      <div className="relative flex items-center py-2" style={{ minHeight: 44 }}>
        {/* Track-Hintergrund */}
        <div className="absolute left-0 right-0 h-2 rounded-full bg-surface1" />
        {/* Gefüllter Anteil */}
        <div
          className="absolute left-0 h-2 rounded-full transition-[width,background-color]"
          style={{
            width: `${pct}%`,
            backgroundColor: trackBgFor(value),
          }}
        />
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handle}
          className="relative w-full appearance-none bg-transparent cursor-pointer slider-vas"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label}
        />
      </div>
      {hint && (
        <p className="font-body text-xs text-overlay0">{hint}</p>
      )}
    </div>
  );
}
