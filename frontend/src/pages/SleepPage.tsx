/** Sleep page — new entry form + list with inline edit, auto-opens running sleep.
 *  Tab navigation: "Einträge" | "Schlafübersicht" (chart).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { useSleepEntries } from "../hooks/useSleep";
import { SleepForm } from "../plugins/sleep/SleepForm";
import { SleepList } from "../plugins/sleep/SleepList";
import { SleepChart } from "../plugins/sleep/SleepChart";

type SleepTab = "list" | "chart";

export default function SleepPage() {
  const { t } = useTranslation("sleep");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<SleepTab>("list");
  const cameFromDashboard = useRef(false);
  const stoppingTimer = useRef(false);

  const { data: entries } = useSleepEntries({
    child_id: activeChild?.id,
  });

  // Derive running entry from data — always up-to-date, no stale state
  const runningEntry = useMemo(
    () => entries?.find((e) => e.end_time == null),
    [entries],
  );

  // Auto-open form when a running entry is detected (not while we are stopping it)
  useEffect(() => {
    if (runningEntry && !stoppingTimer.current) setShowForm(true);
  }, [runningEntry]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      cameFromDashboard.current = true;
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get("tab") === "chart") {
      setTab("chart");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Tutorial-Resume aus sleep_tabs-Schritt: Tab zurueck auf "Einträge"
  // setzen, damit nachfolgende Steps (Filter, Stats) ihre Selektoren finden.
  useEffect(() => {
    const handler = () => {
      setTab("list");
      setShowForm(false);
    };
    window.addEventListener("mybaby:tutorial:sleep-tab-list", handler);
    return () => window.removeEventListener("mybaby:tutorial:sleep-tab-list", handler);
  }, []);

  const handleDone = useCallback(() => {
    stoppingTimer.current = true;
    setShowForm(false);
    // Clear the flag after the query cache has had time to update
    setTimeout(() => { stoppingTimer.current = false; }, 2000);
  }, []);
  const handleCancel = useCallback(() => {
    setShowForm(false);
    if (cameFromDashboard.current) {
      cameFromDashboard.current = false;
      navigate("/");
    }
  }, [navigate]);

  if (!activeChild) {
    return (
      <EmptyState
        icon={Moon}
        title={tc("no_child_selected")}
        description={tc("no_child_selected_hint")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")}>
        {tab === "list" && (
          <Button
            variant={showForm && !runningEntry ? "danger" : "primary"}
            onClick={() => showForm ? handleCancel() : setShowForm(true)}
            data-tutorial="sleep-new-btn"
            className="flex items-center gap-2"
          >
            {showForm && !runningEntry ? tc("cancel") : <><Plus className="h-4 w-4" /> {tc("new")}</>}
          </Button>
        )}
      </PageHeader>

      {/* Tab bar */}
      <div data-tutorial="sleep-tabs" className="flex gap-1 rounded-lg bg-surface0 p-1">
        <button
          onClick={() => { setTab("list"); setShowForm(false); }}
          className={`flex-1 rounded-md px-3 py-2 font-label text-sm transition-colors ${
            tab === "list" ? "bg-surface1 text-text font-semibold shadow-sm" : "text-subtext0 hover:text-text"
          }`}
        >
          {t("chart.tab_list")}
        </button>
        <button
          onClick={() => { setTab("chart"); setShowForm(false); }}
          className={`flex-1 rounded-md px-3 py-2 font-label text-sm transition-colors ${
            tab === "chart" ? "bg-surface1 text-text font-semibold shadow-sm" : "text-subtext0 hover:text-text"
          }`}
        >
          {t("chart.tab_chart")}
        </button>
      </div>

      {tab === "list" && (
        <>
          {showForm && (
            <Card>
              <SleepForm entry={runningEntry} onDone={handleDone} />
            </Card>
          )}
          <SleepList />
        </>
      )}

      {tab === "chart" && <SleepChart />}
    </div>
  );
}
