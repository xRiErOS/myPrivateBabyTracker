/** Growth chart — SVG-based WHO percentile curves with weight or length overlay.
 *
 * Shows P3/P15/P50/P85/P97 percentile bands and child's actual measurements.
 * Toggle between weight (kg) and length (cm). For preterm children, corrected
 * age is used. P0 datapoint is rendered when birth_weight_g / birth_length_cm
 * is set on the child record.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/Card";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useActiveChild } from "../../context/ChildContext";
import { useGrowthChart } from "../../hooks/useGrowth";
import type {
  GrowthMetric,
  MeasurementPoint,
  PercentilePoint,
} from "../../api/growth";

const CHART_W = 600;
const CHART_H = 360;
const PADDING = { top: 20, right: 30, bottom: 40, left: 50 };
const INNER_W = CHART_W - PADDING.left - PADDING.right;
const INNER_H = CHART_H - PADDING.top - PADDING.bottom;
const MAX_WEEKS = 104;

interface MetricConfig {
  maxValue: number;
  ticks: number[];
  unit: string;
}

const METRIC_CONFIG: Record<GrowthMetric, MetricConfig> = {
  weight: { maxValue: 16, ticks: [0, 2, 4, 6, 8, 10, 12, 14, 16], unit: "kg" },
  length: { maxValue: 100, ticks: [40, 50, 60, 70, 80, 90, 100], unit: "cm" },
};

function scaleX(weeks: number): number {
  return PADDING.left + (weeks / MAX_WEEKS) * INNER_W;
}

function scaleY(value: number, max: number, min: number = 0): number {
  return (
    PADDING.top + INNER_H - ((value - min) / (max - min)) * INNER_H
  );
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`
    )
    .join(" ");
}

function buildArea(
  upper: { x: number; y: number }[],
  lower: { x: number; y: number }[]
): string {
  if (upper.length === 0) return "";
  const top = upper
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const bottom = [...lower]
    .reverse()
    .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  return `${top} ${bottom} Z`;
}

function PercentileCurves({
  curves,
  max,
  min,
}: {
  curves: PercentilePoint[];
  max: number;
  min: number;
}) {
  const p3 = curves.map((c) => ({ x: scaleX(c.age_weeks), y: scaleY(c.p3, max, min) }));
  const p15 = curves.map((c) => ({ x: scaleX(c.age_weeks), y: scaleY(c.p15, max, min) }));
  const p50 = curves.map((c) => ({ x: scaleX(c.age_weeks), y: scaleY(c.p50, max, min) }));
  const p85 = curves.map((c) => ({ x: scaleX(c.age_weeks), y: scaleY(c.p85, max, min) }));
  const p97 = curves.map((c) => ({ x: scaleX(c.age_weeks), y: scaleY(c.p97, max, min) }));

  const last = curves[curves.length - 1];

  return (
    <g>
      <path d={buildArea(p97, p3)} fill="var(--color-lavender)" opacity={0.12} />
      <path d={buildArea(p85, p15)} fill="var(--color-lavender)" opacity={0.18} />
      <path
        d={buildPath(p50)}
        fill="none"
        stroke="var(--color-lavender)"
        strokeWidth={2.5}
        opacity={0.9}
      />
      <path
        d={buildPath(p3)}
        fill="none"
        stroke="var(--color-overlay0)"
        strokeWidth={0.8}
        opacity={0.5}
      />
      <path
        d={buildPath(p97)}
        fill="none"
        stroke="var(--color-overlay0)"
        strokeWidth={0.8}
        opacity={0.5}
      />
      <text x={scaleX(MAX_WEEKS) + 4} y={scaleY(last.p97, max, min) + 4} className="fill-overlay0 text-[9px]">P97</text>
      <text x={scaleX(MAX_WEEKS) + 4} y={scaleY(last.p85, max, min) + 4} className="fill-overlay0 text-[9px]">P85</text>
      <text x={scaleX(MAX_WEEKS) + 4} y={scaleY(last.p50, max, min) + 4} className="fill-lavender text-[9px] font-semibold">P50</text>
      <text x={scaleX(MAX_WEEKS) + 4} y={scaleY(last.p15, max, min) + 4} className="fill-overlay0 text-[9px]">P15</text>
      <text x={scaleX(MAX_WEEKS) + 4} y={scaleY(last.p3, max, min) + 4} className="fill-overlay0 text-[9px]">P3</text>
    </g>
  );
}

function MeasurementLine({
  measurements,
  max,
  min,
}: {
  measurements: MeasurementPoint[];
  max: number;
  min: number;
}) {
  if (measurements.length === 0) return null;

  const points = measurements
    .filter((m) => m.age_weeks >= 0 && m.age_weeks <= MAX_WEEKS)
    .map((m) => ({ x: scaleX(m.age_weeks), y: scaleY(m.value, max, min) }));

  return (
    <g>
      {points.length > 1 && (
        <path d={buildPath(points)} fill="none" stroke="var(--color-peach)" strokeWidth={2.5} />
      )}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="var(--color-peach)"
          stroke="var(--color-base)"
          strokeWidth={1.5}
        />
      ))}
    </g>
  );
}

function XAxis() {
  const months = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  return (
    <g>
      <line
        x1={PADDING.left}
        y1={PADDING.top + INNER_H}
        x2={PADDING.left + INNER_W}
        y2={PADDING.top + INNER_H}
        stroke="var(--color-surface1)"
        strokeWidth={1}
      />
      {months.map((m) => {
        const x = scaleX(m * 4.345);
        return (
          <g key={m}>
            <line
              x1={x}
              y1={PADDING.top + INNER_H}
              x2={x}
              y2={PADDING.top + INNER_H + 5}
              stroke="var(--color-surface1)"
            />
            <text
              x={x}
              y={PADDING.top + INNER_H + 18}
              textAnchor="middle"
              className="fill-subtext0 text-[10px]"
            >
              {m}
            </text>
          </g>
        );
      })}
      <text
        x={PADDING.left + INNER_W / 2}
        y={CHART_H - 4}
        textAnchor="middle"
        className="fill-subtext0 text-[11px]"
      >
        Alter (Monate)
      </text>
    </g>
  );
}

function YAxis({
  ticks,
  max,
  min,
  unit,
}: {
  ticks: number[];
  max: number;
  min: number;
  unit: string;
}) {
  return (
    <g>
      <line
        x1={PADDING.left}
        y1={PADDING.top}
        x2={PADDING.left}
        y2={PADDING.top + INNER_H}
        stroke="var(--color-surface1)"
        strokeWidth={1}
      />
      {ticks.map((v) => {
        const y = scaleY(v, max, min);
        return (
          <g key={v}>
            <line x1={PADDING.left - 5} y1={y} x2={PADDING.left} y2={y} stroke="var(--color-surface1)" />
            <line
              x1={PADDING.left}
              y1={y}
              x2={PADDING.left + INNER_W}
              y2={y}
              stroke="var(--color-surface1)"
              strokeWidth={0.3}
              opacity={0.5}
            />
            <text x={PADDING.left - 8} y={y + 4} textAnchor="end" className="fill-subtext0 text-[10px]">
              {v}
            </text>
          </g>
        );
      })}
      <text x={10} y={PADDING.top - 6} className="fill-subtext0 text-[11px]">
        {unit}
      </text>
    </g>
  );
}

export function GrowthChart() {
  const { t } = useTranslation("weight");
  const { activeChild } = useActiveChild();
  const [metric, setMetric] = useState<GrowthMetric>("weight");
  const { data, isLoading, error } = useGrowthChart(activeChild?.id, metric);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    const message =
      (error as { message?: string }).message ?? "Unbekannter Fehler";
    return (
      <Card className="p-4">
        <p className="font-body text-sm text-red">
          {t("growth_chart.error", {
            defaultValue: "Wachstumsdiagramm konnte nicht geladen werden.",
          })}
        </p>
        <p className="font-body text-xs text-subtext0 mt-1">{message}</p>
      </Card>
    );
  }

  if (!data) return null;

  const config = METRIC_CONFIG[metric];
  const yMin = metric === "length" ? 40 : 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="font-headline text-sm font-semibold text-text">
          {t("growth_chart.title")}
        </h3>
        <div className="flex items-center gap-2">
          {data.is_preterm && (
            <span className="font-body text-xs text-lavender bg-lavender/10 px-2 py-0.5 rounded">
              {t("growth_chart.corrected_age")}
            </span>
          )}
          {/* Metric Toggle */}
          <div className="flex rounded-[8px] bg-surface0 border border-surface1 overflow-hidden">
            <button
              type="button"
              onClick={() => setMetric("weight")}
              className={`px-3 py-1 font-label text-xs ${
                metric === "weight"
                  ? "bg-mauve text-base font-semibold"
                  : "text-subtext0 hover:text-text"
              }`}
            >
              {t("growth_chart.weight", { defaultValue: "Gewicht" })}
            </button>
            <button
              type="button"
              onClick={() => setMetric("length")}
              className={`px-3 py-1 font-label text-xs ${
                metric === "length"
                  ? "bg-mauve text-base font-semibold"
                  : "text-subtext0 hover:text-text"
              }`}
            >
              {t("growth_chart.length", { defaultValue: "Länge" })}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <XAxis />
          <YAxis
            ticks={config.ticks}
            max={config.maxValue}
            min={yMin}
            unit={config.unit}
          />
          <PercentileCurves
            curves={data.percentile_curves}
            max={config.maxValue}
            min={yMin}
          />
          <MeasurementLine
            measurements={data.measurements}
            max={config.maxValue}
            min={yMin}
          />
        </svg>
      </div>

      {data.measurements.length > 0 && (
        <div className="mt-2 flex items-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-peach rounded" />
            <span className="font-body text-subtext0">{data.child_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-lavender rounded" />
            <span className="font-body text-subtext0">WHO P50</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-lavender/20 rounded" />
            <span className="font-body text-subtext0">P3-P97</span>
          </div>
        </div>
      )}
    </Card>
  );
}
