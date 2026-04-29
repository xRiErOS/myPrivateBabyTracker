/** Dashboard view tabs — Heute / 7 Tage / 14 Tage. */

export type DashboardView = "today" | "week" | "pattern";

interface ViewTabsProps {
  active: DashboardView;
  onChange: (view: DashboardView) => void;
}

const TABS: { key: DashboardView; label: string }[] = [
  { key: "today", label: "Heute" },
  { key: "week", label: "7 Tage" },
  { key: "pattern", label: "14 Tage" },
];

export function ViewTabs({ active, onChange }: ViewTabsProps) {
  return (
    <div data-tutorial="range-tabs" className="flex bg-surface0 rounded-card p-1 gap-1">
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 py-2 text-sm font-label font-medium rounded-[calc(1rem-4px)] transition-colors min-h-[44px] ${
            active === key
              ? "bg-peach text-ground shadow-sm"
              : "bg-surface1 text-subtext0 hover:text-text hover:bg-surface2"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
