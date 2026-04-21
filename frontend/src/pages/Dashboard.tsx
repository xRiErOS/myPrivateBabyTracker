/** Dashboard page — tabbed views: Heute, 7 Tage, 14 Tage. */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CloudLightning, CloudSun, LayoutDashboard, Plus, Sun, X } from "lucide-react";
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
import { HealthWidget } from "../plugins/health/HealthWidget";
import { TummyTimeWidget } from "../plugins/tummytime/TummyTimeWidget";
import { MilestoneWidget } from "../plugins/milestones/MilestoneWidget";
import { TodoWidget } from "../plugins/todo/TodoWidget";
import { TagsWidget } from "../plugins/tags/TagsWidget";
import { PLUGINS } from "../lib/pluginRegistry";
import { isPluginEnabled, isVisibleOnDashboard } from "../lib/pluginConfig";
import { getQuickActions } from "../lib/quickActions";
import { useLeapStatus } from "../hooks/useMilestones";
import { useSwipe } from "../hooks/useSwipe";
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

  const { data: leapStatus } = useLeapStatus(activeChild?.id);

  function getLeapIndicator() {
    if (!leapStatus) return { icon: Sun, color: "text-green", label: "" };

    if (leapStatus.active_leap) {
      if (leapStatus.active_leap.status === "active_storm") {
        return { icon: CloudLightning, color: "text-peach", label: "Sturm" };
      }
      return { icon: Sun, color: "text-green", label: "Sonne" };
    }

    const upcoming = leapStatus.leaps.find((l) => l.status === "upcoming");
    if (upcoming && upcoming.storm_start_date) {
      const daysUntil = Math.ceil(
        (new Date(upcoming.storm_start_date).getTime() - Date.now()) / 86400000,
      );
      if (daysUntil <= 14) {
        return { icon: CloudSun, color: "text-sapphire", label: `${daysUntil}d` };
      }
    }

    return { icon: Sun, color: "text-green", label: "" };
  }

  const leapIndicator = getLeapIndicator();
  const [showLeapPopup, setShowLeapPopup] = useState(false);

  const VIEW_ORDER: DashboardView[] = ["today", "week", "pattern"];
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      const idx = VIEW_ORDER.indexOf(view);
      if (idx < VIEW_ORDER.length - 1) setView(VIEW_ORDER[idx + 1]);
    },
    onSwipeRight: () => {
      const idx = VIEW_ORDER.indexOf(view);
      if (idx > 0) setView(VIEW_ORDER[idx - 1]);
    },
  });

  // Find the leap to show in popup (active or next upcoming)
  const popupLeap = leapStatus?.active_leap
    ?? leapStatus?.leaps.find((l) => l.status === "upcoming")
    ?? null;

  if (!activeChild) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Kein Kind angelegt"
        description="Lege zuerst ein Kind an, um das Dashboard zu sehen."
      />
    );
  }

  function handleTileClick(category: string, date?: string) {
    if (date) {
      navigate(`/${category}?date=${date}`);
    } else {
      navigate(`/${category}?range=today`);
    }
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
        <span className="font-label text-sm text-subtext0 flex items-center gap-1.5">
          {activeChild.name}
          {isVisibleOnDashboard("milestones") && (
            <button onClick={() => setShowLeapPopup(true)} className="flex items-center min-h-[44px] min-w-[44px] justify-center" aria-label="Spruenge">
              <leapIndicator.icon className={`h-4 w-4 ${leapIndicator.color}`} />
            </button>
          )}
        </span>
      </div>

      {/* Alert Banner */}
      <AlertBanner />

      {/* Quick Actions + Add Menu */}
      <QuickActionsBar navigate={navigate} />

      {/* View Tabs */}
      <ViewTabs active={view} onChange={setView} />

      {/* Content — swipeable */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div {...swipeHandlers}>
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

      {/* Leap Popup */}
      {showLeapPopup && popupLeap && (
        <LeapPopup leap={popupLeap} onClose={() => setShowLeapPopup(false)} />
      )}
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

      {/* Add Menu Modal */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={closeMenu}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-ground/80 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-sm bg-surface0 rounded-2xl p-4 space-y-1 animate-fade-in max-h-[80vh] overflow-y-auto overscroll-contain"
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
            {PLUGINS.filter((p) => p.route && isPluginEnabled(p.key)).map((plugin) => {
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
      {(isVisibleOnDashboard("temperature") || isVisibleOnDashboard("medication") || isVisibleOnDashboard("weight") || isVisibleOnDashboard("health") || isVisibleOnDashboard("tummytime") || isVisibleOnDashboard("milestones") || isVisibleOnDashboard("todo") || isVisibleOnDashboard("tags")) && (
        <div className="grid grid-cols-2 gap-3">
          {isVisibleOnDashboard("temperature") && <TemperatureWidget />}
          {isVisibleOnDashboard("medication") && (
            <div className="row-span-2">
              <MedicationWidget />
            </div>
          )}
          {isVisibleOnDashboard("weight") && <WeightWidget />}
          {isVisibleOnDashboard("health") && <HealthWidget childId={childId} />}
          {isVisibleOnDashboard("tummytime") && <TummyTimeWidget />}
          {isVisibleOnDashboard("milestones") && <MilestoneWidget childId={childId} />}
          {isVisibleOnDashboard("todo") && <TodoWidget />}
          {isVisibleOnDashboard("tags") && <TagsWidget />}
        </div>
      )}

    </div>
  );
}

function parseJsonArray(val: string | null): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function LeapPopup({ leap, onClose }: { leap: import("../api/types").LeapStatusItem; onClose: () => void }) {
  const nav = useNavigate();
  const isStorm = leap.status === "active_storm";
  const isSun = leap.status === "active_sun";
  const isUpcoming = leap.status === "upcoming" || leap.status === "far_future";
  const skills = parseJsonArray(leap.new_skills);
  const signs = parseJsonArray(leap.storm_signs);

  const stormStart = leap.storm_start_date
    ? new Date(leap.storm_start_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })
    : "";
  const countdown = leap.storm_start_date
    ? Math.ceil((new Date(leap.storm_start_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-ground rounded-[12px] shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface0">
          <h3 className="font-headline text-base font-semibold text-text">
            Sprung {leap.leap_number} &mdash; {leap.title}
          </h3>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            {isStorm && <CloudLightning className="h-5 w-5 text-peach" />}
            {isSun && <Sun className="h-5 w-5 text-green" />}
            {isUpcoming && <CloudSun className="h-5 w-5 text-sapphire" />}
            <span className={`font-label text-sm font-medium ${isStorm ? "text-peach" : isSun ? "text-green" : "text-sapphire"}`}>
              {isStorm ? "Sturmphase" : isSun ? "Sonnenphase" : "Bevorstehend"}
            </span>
            {isUpcoming && countdown !== null && countdown > 0 && (
              <span className="font-body text-xs text-sapphire">in {countdown} Tagen (ab {stormStart})</span>
            )}
          </div>

          {/* Description */}
          <p className="font-body text-sm text-subtext0">{leap.description}</p>

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <h4 className="font-headline text-sm font-semibold text-green mb-2">Neue Faehigkeiten</h4>
              {skills.map((s, i) => (
                <p key={i} className="font-body text-sm text-text py-0.5">• {s}</p>
              ))}
            </div>
          )}

          {/* Storm signs */}
          {signs.length > 0 && (
            <div>
              <h4 className="font-headline text-sm font-semibold text-peach mb-2">Sturm-Anzeichen</h4>
              {signs.map((s, i) => (
                <p key={i} className="font-body text-sm text-text py-0.5">• {s}</p>
              ))}
            </div>
          )}

          {/* Link to milestones */}
          <button
            onClick={() => { onClose(); nav("/milestones?tab=leaps"); }}
            className="font-label text-sm text-lavender hover:underline mt-2"
          >
            Alle Spruenge anzeigen →
          </button>
        </div>
      </div>
    </div>
  );
}
