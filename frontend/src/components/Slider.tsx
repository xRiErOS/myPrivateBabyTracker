/** Slider — neutrale visuelle Analogskala.
 *
 * Bewusst KEIN Farbverlauf (grün → rot): Selbstauskunft soll nicht durch
 * visuelle Wertung beeinflusst werden. Track + Wert-Anzeige in Catppuccin
 * mauve (primary). Touch-Target ≥44 px.
 */

import type { ChangeEvent } from "react";

interface SliderProps {
  label: string;
  /** `null` markiert den Untouched-State (kein Daumen, kein Wert). */
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  id?: string;
  /** Anzahl Nachkommastellen für die Wert-Anzeige. Default: step < 1 ? 1 : 0. */
  precision?: number;
  /** Endpunkt-Beschriftungen (links/rechts unter dem Track). */
  endpoints?: { min: string; max: string };
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
  precision,
  endpoints,
}: SliderProps) {
  const sliderId = id ?? `slider-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const untouched = value === null;
  const effective = value ?? min;
  const pct = untouched ? 0 : ((effective - min) / (max - min)) * 100;
  const digits = precision ?? (step < 1 ? 1 : 0);

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
          className="font-label text-sm font-semibold tabular-nums text-text"
          aria-live="polite"
        >
          {untouched ? "—" : effective.toFixed(digits)}
        </span>
      </div>
      <div className="relative flex items-center py-2" style={{ minHeight: 44 }}>
        {/* Track-Hintergrund */}
        <div className="absolute left-0 right-0 h-2 rounded-full bg-surface1" />
        {/* Gefüllter Anteil — neutrale Farbe (mauve). Im Untouched-State unsichtbar. */}
        {!untouched && (
          <div
            className="absolute left-0 h-2 rounded-full bg-mauve transition-[width]"
            style={{ width: `${pct}%` }}
          />
        )}
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={effective}
          onChange={handle}
          className={`relative w-full appearance-none bg-transparent cursor-pointer slider-vas ${
            untouched ? "slider-vas-untouched" : ""
          }`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={untouched ? undefined : effective}
          aria-label={label}
        />
      </div>
      {endpoints && (
        <div className="flex items-center justify-between font-body text-xs text-overlay0">
          <span>{endpoints.min}</span>
          <span>{endpoints.max}</span>
        </div>
      )}
      {hint && (
        <p className="font-body text-xs text-overlay0">{hint}</p>
      )}
    </div>
  );
}
