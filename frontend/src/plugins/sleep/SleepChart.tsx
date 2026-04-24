/** Sleep chart — SVG-based daily sleep totals with age-specific target band.
 *
 * X-axis: days (last N days)
 * Y-axis: hours (0-24h)
 * Green band: recommended sleep range (NSF/AAP)
 * Peach line: actual sleep data
 * Red dots: days outside target range
 */

import { useTranslation } from "react-i18next";
import { Card } from "../../components/Card";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useActiveChild } from "../../context/ChildContext";
import { useSleepChart } from "../../hooks/useSleep";
import type { SleepDayPoint } from "../../api/sleep";

const CHART_W = 600;
const CHART_H = 360;
const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };
const INNER_W = CHART_W - PADDING.left - PADDING.right;
const INNER_H = CHART_H - PADDING.top - PADDING.bottom;

const MAX_HOURS = 24;

function scaleY(hours: number): number {
  return PADDING.top + INNER_H - (hours / MAX_HOURS) * INNER_H;
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

function TargetBand({
  targetMin,
  targetMax,
  width,
}: {
  targetMin: number;
  targetMax: number;
  width: number;
}) {
  const y1 = scaleY(targetMax);
  const y2 = scaleY(targetMin);
  return (
    <rect
      x={PADDING.left}
      y={y1}
      width={width}
      height={y2 - y1}
      fill="var(--ctp-green)"
      opacity={0.15}
    />
  );
}

function DataLine({
  measurements,
  targetMin,
  targetMax,
  scaleXFn,
}: {
  measurements: SleepDayPoint[];
  targetMin: number;
  targetMax: number;
  scaleXFn: (i: number) => number;
}) {
  // Only include days with data for the line
  const pointsWithData = measurements
    .map((m, i) => ({
      x: scaleXFn(i),
      y: scaleY(m.total_hours),
      total: m.total_hours,
      hasData: m.total_hours > 0,
    }));

  const linePoints = pointsWithData.filter((p) => p.hasData);

  return (
    <g>
      {/* Line connecting data points */}
      {linePoints.length > 1 && (
        <path
          d={buildPath(linePoints)}
          fill="none"
          stroke="var(--ctp-peach)"
          strokeWidth={2.5}
        />
      )}
      {/* Data dots */}
      {pointsWithData
        .filter((p) => p.hasData)
        .map((p, i) => {
          const inRange = p.total >= targetMin && p.total <= targetMax;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={inRange ? "var(--ctp-peach)" : "var(--ctp-red)"}
              stroke="var(--ctp-base)"
              strokeWidth={1.5}
            />
          );
        })}
    </g>
  );
}

function XAxis({
  measurements,
  scaleXFn,
}: {
  measurements: SleepDayPoint[];
  scaleXFn: (i: number) => number;
}) {
  // Show a tick every ~5 days
  const step = Math.max(1, Math.floor(measurements.length / 6));
  const ticks = measurements
    .map((m, i) => ({ i, label: m.date.slice(5) })) // MM-DD
    .filter((_, i) => i % step === 0 || i === measurements.length - 1);

  return (
    <g>
      <line
        x1={PADDING.left}
        y1={PADDING.top + INNER_H}
        x2={PADDING.left + INNER_W}
        y2={PADDING.top + INNER_H}
        stroke="var(--ctp-surface1)"
        strokeWidth={1}
      />
      {ticks.map(({ i, label }) => {
        const x = scaleXFn(i);
        return (
          <g key={i}>
            <line
              x1={x}
              y1={PADDING.top + INNER_H}
              x2={x}
              y2={PADDING.top + INNER_H + 5}
              stroke="var(--ctp-surface1)"
            />
            <text
              x={x}
              y={PADDING.top + INNER_H + 18}
              textAnchor="middle"
              className="fill-subtext0 text-[10px]"
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function YAxis() {
  const ticks = [0, 4, 8, 12, 16, 20, 24];
  return (
    <g>
      <line
        x1={PADDING.left}
        y1={PADDING.top}
        x2={PADDING.left}
        y2={PADDING.top + INNER_H}
        stroke="var(--ctp-surface1)"
        strokeWidth={1}
      />
      {ticks.map((h) => {
        const y = scaleY(h);
        return (
          <g key={h}>
            <line
              x1={PADDING.left - 5}
              y1={y}
              x2={PADDING.left}
              y2={y}
              stroke="var(--ctp-surface1)"
            />
            <line
              x1={PADDING.left}
              y1={y}
              x2={PADDING.left + INNER_W}
              y2={y}
              stroke="var(--ctp-surface1)"
              strokeWidth={0.3}
              opacity={0.5}
            />
            <text
              x={PADDING.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-subtext0 text-[10px]"
            >
              {h}
            </text>
          </g>
        );
      })}
      <text
        x={10}
        y={PADDING.top - 6}
        className="fill-subtext0 text-[11px]"
      >
        h
      </text>
    </g>
  );
}

export function SleepChart() {
  const { t } = useTranslation("sleep");
  const { activeChild } = useActiveChild();
  const { data, isLoading } = useSleepChart(activeChild?.id);

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const count = data.measurements.length;
  const scaleXFn = (i: number): number =>
    PADDING.left + (count > 1 ? (i / (count - 1)) * INNER_W : INNER_W / 2);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-headline text-sm font-semibold text-text">
          {t("chart.title")}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-subtext0">
            {data.age_group}
          </span>
          {data.is_preterm && (
            <span className="font-body text-xs text-lavender bg-lavender/10 px-2 py-0.5 rounded">
              {t("chart.corrected_age")}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full min-w-[400px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <TargetBand
            targetMin={data.target_min_hours}
            targetMax={data.target_max_hours}
            width={INNER_W}
          />
          <XAxis measurements={data.measurements} scaleXFn={scaleXFn} />
          <YAxis />
          <DataLine
            measurements={data.measurements}
            targetMin={data.target_min_hours}
            targetMax={data.target_max_hours}
            scaleXFn={scaleXFn}
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-peach rounded" />
          <span className="font-body text-subtext0">{data.child_name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 bg-green/20 rounded" />
          <span className="font-body text-subtext0">
            {t("chart.target_range", {
              min: data.target_min_hours,
              max: data.target_max_hours,
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red" />
          <span className="font-body text-subtext0">
            {t("chart.outside_range")}
          </span>
        </div>
      </div>
    </Card>
  );
}
