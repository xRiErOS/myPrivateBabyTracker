/** Compact summary bar for list views — mirrors dashboard widget metrics. */

import type { ReactNode } from "react";

interface ListSummaryBarProps {
  children: ReactNode;
  "data-tutorial"?: string;
}

export function ListSummaryBar({ children, "data-tutorial": dataTutorial }: ListSummaryBarProps) {
  return (
    <div data-tutorial={dataTutorial} className="bg-surface0 rounded-card p-3 flex flex-col gap-2">
      {children}
    </div>
  );
}

interface MetricPillProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function MetricPill({ label, value, className = "" }: MetricPillProps) {
  return (
    <div className={`bg-surface1 rounded-lg px-2.5 py-1.5 text-center flex-1 ${className}`.trim()}>
      <p className="font-headline text-sm font-semibold text-text">{value}</p>
      <p className="font-body text-[9px] text-subtext0 uppercase tracking-wider">{label}</p>
    </div>
  );
}
