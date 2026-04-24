/** Milestones page — 4-tab view: Overview, Timeline, All, Leaps. */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { useSwipe } from "../hooks/useSwipe";
import MilestonesOverview from "../plugins/milestones/MilestonesOverview";
import { MilestonesList } from "../plugins/milestones/MilestonesList";
import { MilestonesTimeline } from "../plugins/milestones/MilestonesTimeline";
import { LeapCalendar } from "../plugins/milestones/LeapCalendar";

const TAB_KEYS = [
  { key: "overview", labelKey: "tab_overview" },
  { key: "timeline", labelKey: "tab_timeline" },
  { key: "all", labelKey: "tab_all" },
  { key: "leaps", labelKey: "tab_leaps" },
] as const;

type TabKey = (typeof TAB_KEYS)[number]["key"];

export default function MilestonesPage() {
  const { t } = useTranslation("milestones");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(
    TAB_KEYS.some(tk => tk.key === initialTab) ? initialTab : "overview"
  );

  const TAB_ORDER: TabKey[] = TAB_KEYS.map(tk => tk.key);
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
        title={tc("no_child_selected")}
        description={tc("no_child_selected_hint")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} />

      {/* Tab Bar */}
      <div className="flex gap-1 bg-surface0 rounded-[8px] p-1">
        {TAB_KEYS.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 min-h-[40px] rounded-[6px] font-label text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-mauve text-white shadow-sm"
                : "text-subtext0 hover:text-text hover:bg-surface1"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Tab Content — swipeable */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div {...swipeHandlers}>
        {activeTab === "overview" && <MilestonesOverview />}
        {activeTab === "timeline" && <MilestonesTimeline />}
        {activeTab === "all" && <MilestonesList />}
        {activeTab === "leaps" && <LeapCalendar />}
      </div>
    </div>
  );
}
