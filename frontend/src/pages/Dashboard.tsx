/** Dashboard page — tabbed views: Heute, 7 Tage, 14 Tage. */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplets, LayoutDashboard, Moon, Pill, Plus, Scale, Thermometer, Utensils } from "lucide-react";
import { AlertBanner } from "../components/AlertBanner";
import { Button } from "../components/Button";
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
import { SleepWidget } from "../plugins/sleep/SleepWidget";
import { VitaminD3Widget } from "../plugins/vitamind3/VitaminD3Widget";
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
    navigate(`/${category}`);
  }

  const today = todayBerlin();

  return (
    <div className="space-y-4">
      <h2 className="font-headline text-lg font-semibold">{activeChild.name}</h2>

      {/* Alert Banner */}
      <AlertBanner />

      {/* Quick Actions */}
      <div className="flex gap-1.5 flex-wrap">
        <Button
          variant="secondary"
          onClick={() => navigate("/sleep?new=1")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <Moon className="h-4 w-4" />
          Schlaf
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/feeding?new=1")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <Utensils className="h-4 w-4" />
          Mahlzeiten
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/diaper?new=1")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <Droplets className="h-4 w-4" />
          Windel
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/temperature?new=1")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <Thermometer className="h-4 w-4" />
          Temperatur
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/weight?new=1")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <Scale className="h-4 w-4" />
          Gewicht
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/medication?new=1")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <Pill className="h-4 w-4" />
          Medikament
        </Button>
      </div>

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
        sleeps={data.sleeps}
        onTileClick={onTileClick}
      />
      <SleepWidget childId={childId} />
      <DayTimeline
        feedings={todayFeedings}
        diapers={todayDiapers}
        sleepSegments={todaySleepSegments}
        isToday
      />
      <TemperatureWidget />
      <WeightWidget />
      <MedicationWidget />
      <VitaminD3Widget />
    </div>
  );
}
