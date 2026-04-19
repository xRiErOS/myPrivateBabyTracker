/** Date range filter buttons — Heute / 7 Tage / Alle. */

export type DateRange = "today" | "week" | "all";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const OPTIONS: { key: DateRange; label: string }[] = [
  { key: "today", label: "Heute" },
  { key: "week", label: "7 Tage" },
  { key: "all", label: "Alle" },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex gap-1 bg-surface0 rounded-card p-1">
      {OPTIONS.map(({ key, label }) => (
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
          {label}
        </button>
      ))}
    </div>
  );
}
