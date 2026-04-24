/** Growth chart — SVG-based WHO percentile curves with weight overlay.
 *
 * Shows P3/P15/P50/P85/P97 percentile bands and child's actual weight data.
 * For preterm children, corrected age is used.
 */

import { useTranslation } from "react-i18next";
import { Card } from "../../components/Card";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useActiveChild } from "../../context/ChildContext";
import { useGrowthChart } from "../../hooks/useGrowth";
import type { PercentilePoint, WeightDataPoint } from "../../api/growth";

const CHART_W = 600;
const CHART_H = 360;
const PADDING = { top: 20, right: 30, bottom: 40, left: 50 };
const INNER_W = CHART_W - PADDING.left - PADDING.right;
const INNER_H = CHART_H - PADDING.top - PADDING.bottom;

// Max age in weeks to display (24 months)
const MAX_WEEKS = 104;
// Max weight in kg for y-axis
const MAX_KG = 16;

function scaleX(weeks: number): number {
  return PADDING.left + (weeks / MAX_WEEKS) * INNER_W;
}

function scaleY(kg: number): number {
  return PADDING.top + INNER_H - (kg / MAX_KG) * INNER_H;
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function buildArea(upper: { x: number; y: number }[], lower: { x: number; y: number }[]): string {
  if (upper.length === 0) return "";
  const top = upper.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const bottom = [...lower].reverse().map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return `${top} ${bottom} Z`;
}

function PercentileCurves({ curves }: { curves: PercentilePoint[] }) {
  const p3 = curves.map((c) => ({ x: scaleX(c.age_weeks), y: scaleY(c.p3) }));
  const p15 = curves.map((c) => ({ x: scaleX(c.age_weeks), y: scaleY(c.p15) }));
  const p50 = curves.map((c) => ({ x: scaleX(c.age_weeks), y: scaleY(c.p50) }));
  const p85 = curves.map((c) => ({ x: scaleX(c.age_weeks), y: scaleY(c.p85) }));
  const p97 = curves.map((c) => ({ x: scaleX(c.age_weeks), y: scaleY(c.p97) }));

  return (
    <g>
      {/* P3-P97 band (lightest) */}
      <path d={buildArea(p97, p3)} fill="var(--ctp-lavender)" opacity={0.12} />
      {/* P15-P85 band */}
      <path d={buildArea(p85, p15)} fill="var(--ctp-lavender)" opacity={0.18} />
      {/* P50 line (median) */}
      <path d={buildPath(p50)} fill="none" stroke="var(--ctp-lavender)" strokeWidth={2} strokeDasharray="6 3" />
      {/* P3 and P97 lines (thin) */}
      <path d={buildPath(p3)} fill="none" stroke="var(--ctp-overlay0)" strokeWidth={0.8} opacity={0.5} />
      <path d={buildPath(p97)} fill="none" stroke="var(--ctp-overlay0)" strokeWidth={0.8} opacity={0.5} />
      {/* Labels */}
      <text x={scaleX(MAX_WEEKS) + 4} y={scaleY(curves[curves.length - 1].p97) + 4} className="fill-overlay0 text-[9px]">P97</text>
      <text x={scaleX(MAX_WEEKS) + 4} y={scaleY(curves[curves.length - 1].p85) + 4} className="fill-overlay0 text-[9px]">P85</text>
      <text x={scaleX(MAX_WEEKS) + 4} y={scaleY(curves[curves.length - 1].p50) + 4} className="fill-lavender text-[9px] font-semibold">P50</text>
      <text x={scaleX(MAX_WEEKS) + 4} y={scaleY(curves[curves.length - 1].p15) + 4} className="fill-overlay0 text-[9px]">P15</text>
      <text x={scaleX(MAX_WEEKS) + 4} y={scaleY(curves[curves.length - 1].p3) + 4} className="fill-overlay0 text-[9px]">P3</text>
    </g>
  );
}

function WeightLine({ measurements }: { measurements: WeightDataPoint[] }) {
  if (measurements.length === 0) return null;

  const points = measurements
    .filter((m) => m.age_weeks >= 0 && m.age_weeks <= MAX_WEEKS)
    .map((m) => ({ x: scaleX(m.age_weeks), y: scaleY(m.weight_kg) }));

  return (
    <g>
      {/* Line connecting measurements */}
      {points.length > 1 && (
        <path d={buildPath(points)} fill="none" stroke="var(--ctp-peach)" strokeWidth={2.5} />
      )}
      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--ctp-peach)" stroke="var(--ctp-base)" strokeWidth={1.5} />
      ))}
    </g>
  );
}

function XAxis() {
  const months = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  return (
    <g>
      <line x1={PADDING.left} y1={PADDING.top + INNER_H} x2={PADDING.left + INNER_W} y2={PADDING.top + INNER_H} stroke="var(--ctp-surface1)" strokeWidth={1} />
      {months.map((m) => {
        const x = scaleX(m * 4.345); // months to weeks
        return (
          <g key={m}>
            <line x1={x} y1={PADDING.top + INNER_H} x2={x} y2={PADDING.top + INNER_H + 5} stroke="var(--ctp-surface1)" />
            <text x={x} y={PADDING.top + INNER_H + 18} textAnchor="middle" className="fill-subtext0 text-[10px]">
              {m}
            </text>
          </g>
        );
      })}
      <text x={PADDING.left + INNER_W / 2} y={CHART_H - 4} textAnchor="middle" className="fill-subtext0 text-[11px]">
        Alter (Monate)
      </text>
    </g>
  );
}

function YAxis() {
  const ticks = [0, 2, 4, 6, 8, 10, 12, 14, 16];
  return (
    <g>
      <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + INNER_H} stroke="var(--ctp-surface1)" strokeWidth={1} />
      {ticks.map((kg) => {
        const y = scaleY(kg);
        return (
          <g key={kg}>
            <line x1={PADDING.left - 5} y1={y} x2={PADDING.left} y2={y} stroke="var(--ctp-surface1)" />
            <line x1={PADDING.left} y1={y} x2={PADDING.left + INNER_W} y2={y} stroke="var(--ctp-surface1)" strokeWidth={0.3} opacity={0.5} />
            <text x={PADDING.left - 8} y={y + 4} textAnchor="end" className="fill-subtext0 text-[10px]">
              {kg}
            </text>
          </g>
        );
      })}
      <text x={12} y={PADDING.top + INNER_H / 2} textAnchor="middle" className="fill-subtext0 text-[11px]" transform={`rotate(-90, 12, ${PADDING.top + INNER_H / 2})`}>
        kg
      </text>
    </g>
  );
}

export function GrowthChart() {
  const { t } = useTranslation("weight");
  const { activeChild } = useActiveChild();
  const { data, isLoading } = useGrowthChart(activeChild?.id);

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-headline text-sm font-semibold text-text">
          {t("growth_chart.title")}
        </h3>
        {data.is_preterm && (
          <span className="font-body text-xs text-lavender bg-lavender/10 px-2 py-0.5 rounded">
            {t("growth_chart.corrected_age")}
          </span>
        )}
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full min-w-[400px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <XAxis />
          <YAxis />
          <PercentileCurves curves={data.percentile_curves} />
          <WeightLine measurements={data.measurements} />
        </svg>
      </div>

      {data.measurements.length > 0 && (
        <div className="mt-2 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-peach rounded" />
            <span className="font-body text-subtext0">{data.child_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-lavender rounded" style={{ borderStyle: "dashed" }} />
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
