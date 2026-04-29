/** Date range filter buttons — Heute / 7 Tage / Alle. */

import { useTranslation } from "react-i18next";

export type DateRange = "today" | "week" | "twoWeeks" | "all";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const OPTIONS: { key: DateRange; labelKey: string }[] = [
  { key: "today", labelKey: "date_range.today" },
  { key: "week", labelKey: "date_range.days_7" },
  { key: "twoWeeks", labelKey: "date_range.days_14" },
  { key: "all", labelKey: "date_range.all" },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const { t: tc } = useTranslation("common");
  return (
    <div data-tutorial="range-tabs" className="flex gap-1 bg-surface0 rounded-card p-1">
      {OPTIONS.map(({ key, labelKey }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 py-1.5 text-xs font-label font-medium rounded-[calc(1rem-4px)] transition-colors min-h-[36px] ${
            value === key
              ? "bg-surface1 text-text"
              : "text-subtext0 hover:text-text"
          }`}
        >
          {tc(labelKey)}
        </button>
      ))}
    </div>
  );
}
