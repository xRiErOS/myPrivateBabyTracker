/** Milestones page — 4-tab view: Overview, Timeline, All, Leaps. */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Star } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { useSwipe } from "../hooks/useSwipe";
import MilestonesOverview from "../plugins/milestones/MilestonesOverview";
import { MilestonesList } from "../plugins/milestones/MilestonesList";
import { LeapCalendar } from "../plugins/milestones/LeapCalendar";

const TABS = [
  { key: "overview", label: "Uebersicht" },
  { key: "all", label: "Alle" },
  { key: "leaps", label: "Spruenge" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MilestonesPage() {
  const { activeChild } = useActiveChild();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(
    TABS.some(t => t.key === initialTab) ? initialTab : "overview"
  );

  const TAB_ORDER: TabKey[] = TABS.map(t => t.key);
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      const idx = TAB_ORDER.indexOf(activeTab);
      if (idx < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[idx + 1]);
    },
    onSwipeRight: () => {
      const idx = TAB_ORDER.indexOf(activeTab);
      if (idx > 0) setActiveTab(TAB_ORDER[idx - 1]);
    },
  });

  if (!activeChild) {
    return (
      <EmptyState
        icon={Star}
        title="Kein Kind ausgewaehlt"
        description="Waehle zuerst ein Kind aus."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Meilensteine" />

      {/* Tab Bar */}
      <div className="flex gap-1 bg-surface0 rounded-[8px] p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 min-h-[40px] rounded-[6px] font-label text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-mauve text-white shadow-sm"
                : "text-subtext0 hover:text-text hover:bg-surface1"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content — swipeable */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div {...swipeHandlers}>
        {activeTab === "overview" && <MilestonesOverview />}
        {activeTab === "all" && <MilestonesList />}
        {activeTab === "leaps" && <LeapCalendar />}
      </div>
    </div>
  );
}
