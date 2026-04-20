/** Dashboard page — tabbed views: Heute, 7 Tage, 14 Tage. */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Plus, X } from "lucide-react";
import { AlertBanner } from "../components/AlertBanner";
import { EmptyState } from "../components/EmptyState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useActiveChild } from "../context/ChildContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { ViewTabs, type DashboardView } from "../components/dashboard/ViewTabs";
import { BabySummary } from "../components/dashboard/BabySummary";
import { DayTimeline } from "../components/dashboard/DayTimeline";
import { WeeklyReport } from "../components/dashboard/WeeklyReport";
import { PatternChart } from "../components/dashboard/PatternChart";
import { TemperatureWidget } from "../plugins/temperature/TemperatureWidget";
import { MedicationWidget } from "../plugins/medication/MedicationWidget";
import { WeightWidget } from "../plugins/weight/WeightWidget";
import { VitaminD3Widget } from "../plugins/vitamind3/VitaminD3Widget";
import { PLUGINS } from "../lib/pluginRegistry";
import { getQuickActions } from "../lib/quickActions";
import {
  splitSleepByDay,
  groupByDay,
  todayBerlin,
} from "../lib/timelineUtils";

const VIEW_DAYS: Record<DashboardView, number> = {
  today: 2, // today + yesterday for comparison
  week: 7,
  pattern: 14,
};

export default function Dashboard() {
  const { activeChild } = useActiveChild();
  const navigate = useNavigate();
  const [view, setView] = useState<DashboardView>("today");

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { data, isLoading } = useDashboardData(
    activeChild?.id ?? 0,
    VIEW_DAYS[view],
  );

  if (!activeChild) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Kein Kind angelegt"
        description="Lege zuerst ein Kind an, um das Dashboard zu sehen."
      />
    );
  }

  function handleTileClick(category: string) {
    navigate(`/${category}?range=today`);
  }

  const today = todayBerlin();

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-headline text-lg font-semibold">
          {now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
          {" — "}
          {now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
        </h2>
        <span className="font-label text-sm text-subtext0">{activeChild.name}</span>
      </div>

      {/* Alert Banner */}
      <AlertBanner />

      {/* Quick Actions + Add Menu */}
      <QuickActionsBar navigate={navigate} />

      {/* View Tabs */}
      <ViewTabs active={view} onChange={setView} />

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : data ? (
        <>
          {view === "today" && (
            <TodayView
              data={data}
              today={today}
              onTileClick={handleTileClick}
              childId={activeChild.id}
            />
          )}
          {view === "week" && (
            <WeeklyReport
              feedings={data.feedings}
              diapers={data.diapers}
              sleeps={data.sleeps}
              onEntityClick={handleTileClick}
            />
          )}
          {view === "pattern" && (
            <PatternChart
              feedings={data.feedings}
              diapers={data.diapers}
              sleeps={data.sleeps}
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function QuickActionsBar({ navigate }: { navigate: (path: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const quickActionKeys = getQuickActions();
  const quickPlugins = quickActionKeys
    .map((key) => PLUGINS.find((p) => p.key === key))
    .filter(Boolean) as typeof PLUGINS;

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <div className="flex gap-2">
        {quickPlugins.map((plugin) => {
          const Icon = plugin.icon;
          return (
            <button
              key={plugin.key}
              onClick={() => navigate(`${plugin.route}?new=1`)}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-[8px] bg-surface1 text-text font-label text-sm font-semibold transition-all hover:bg-surface2 active:bg-surface2"
            >
              <Icon className="h-4 w-4" />
              {plugin.label}
            </button>
          );
        })}
        <button
          onClick={() => setMenuOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] bg-peach text-ground font-label text-sm font-semibold transition-all hover:opacity-90"
          aria-label="Neuer Eintrag"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Add Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          onClick={closeMenu}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-ground/80 backdrop-blur-sm" />

          {/* Bottom Sheet */}
          <div
            className="relative bg-surface0 rounded-t-2xl p-4 pb-8 space-y-1 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline text-base font-semibold text-text">
                Neuer Eintrag
              </h3>
              <button
                onClick={closeMenu}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-surface1 text-subtext0"
                aria-label="Schliessen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {PLUGINS.map((plugin) => {
              const Icon = plugin.icon;
              return (
                <button
                  key={plugin.key}
                  onClick={() => {
                    navigate(`${plugin.route}?new=1`);
                    closeMenu();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-lg text-text hover:bg-surface1 active:bg-surface1 transition-colors"
                >
                  <Icon className="h-5 w-5 text-subtext0" />
                  <span className="font-label text-sm">{plugin.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function TodayView({
  data,
  today,
  onTileClick,
  childId,
}: {
  data: { feedings: import("../api/types").FeedingEntry[]; diapers: import("../api/types").DiaperEntry[]; sleeps: import("../api/types").SleepEntry[] };
  today: string;
  onTileClick: (category: string) => void;
  childId: number;
}) {
  const feedByDay = groupByDay(data.feedings, "start_time");
  const diaperByDay = groupByDay(data.diapers, "time");
  const sleepMap = splitSleepByDay(data.sleeps);

  const todayFeedings = feedByDay[today] ?? [];
  const todayDiapers = diaperByDay[today] ?? [];
  const todaySleepSegments = sleepMap[today] ?? [];

  return (
    <div className="space-y-4">
      <BabySummary
        feedings={data.feedings}
        diapers={data.diapers}
        childId={childId}
        onTileClick={onTileClick}
      />
      <DayTimeline
        feedings={todayFeedings}
        diapers={todayDiapers}
        sleepSegments={todaySleepSegments}
        isToday
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          <TemperatureWidget />
          <WeightWidget />
        </div>
        <div className="flex flex-col gap-3">
          <VitaminD3Widget />
          <MedicationWidget />
        </div>
      </div>
    </div>
  );
}
