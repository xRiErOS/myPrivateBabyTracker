/** Weight page — new entry form + list with inline edit + growth chart tab. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Scale } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { WeightForm } from "../plugins/weight/WeightForm";
import { WeightList } from "../plugins/weight/WeightList";
import { GrowthChart } from "../plugins/growth/GrowthChart";

type WeightTab = "list" | "chart";

export default function WeightPage() {
  const { t } = useTranslation("weight");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<WeightTab>("list");
  const cameFromDashboard = useRef(false);

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

  const handleDone = useCallback(() => setShowForm(false), []);
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
        icon={Scale}
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
            variant={showForm ? "danger" : "primary"}
            onClick={() => showForm ? handleCancel() : setShowForm(true)}
            className="flex items-center gap-2"
          >
            {showForm ? tc("cancel") : <><Plus className="h-4 w-4" /> {tc("new")}</>}
          </Button>
        )}
      </PageHeader>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-surface0 p-1">
        <button
          onClick={() => { setTab("list"); setShowForm(false); }}
          className={`flex-1 rounded-md px-3 py-2 font-label text-sm transition-colors ${
            tab === "list" ? "bg-surface1 text-text font-semibold shadow-sm" : "text-subtext0 hover:text-text"
          }`}
        >
          {t("growth_chart.tab_list")}
        </button>
        <button
          onClick={() => { setTab("chart"); setShowForm(false); }}
          className={`flex-1 rounded-md px-3 py-2 font-label text-sm transition-colors ${
            tab === "chart" ? "bg-surface1 text-text font-semibold shadow-sm" : "text-subtext0 hover:text-text"
          }`}
        >
          {t("growth_chart.tab_chart")}
        </button>
      </div>

      {tab === "list" && (
        <>
          {showForm && (
            <Card>
              <WeightForm onDone={handleDone} />
            </Card>
          )}
          {!showForm && <WeightList />}
        </>
      )}

      {tab === "chart" && <GrowthChart />}
    </div>
  );
}
