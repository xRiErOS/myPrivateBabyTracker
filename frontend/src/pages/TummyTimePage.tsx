/** Tummy time page -- new entry form + list with inline edit, auto-opens running session. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Timer, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { useTummyTimeEntries } from "../hooks/useTummyTime";
import { TummyTimeForm } from "../plugins/tummytime/TummyTimeForm";
import { TummyTimeList } from "../plugins/tummytime/TummyTimeList";

export default function TummyTimePage() {
  const { t } = useTranslation("tummytime");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const cameFromDashboard = useRef(false);

  const { data: entries } = useTummyTimeEntries({
    child_id: activeChild?.id,
  });

  // Derive running entry from data — always up-to-date, no stale state
  const runningEntry = useMemo(
    () => entries?.find((e) => e.end_time == null),
    [entries],
  );

  // Auto-open form when a running entry is detected
  useEffect(() => {
    if (runningEntry) setShowForm(true);
  }, [runningEntry]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      cameFromDashboard.current = true;
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDone = useCallback(() => {
    setShowForm(false);
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
        icon={Timer}
        title={tc("no_child_selected")}
        description={tc("no_child_selected_hint")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")}>
        <Button
          variant={showForm && !runningEntry ? "danger" : "primary"}
          onClick={() => showForm ? handleCancel() : setShowForm(true)}
          className="flex items-center gap-2"
        >
          {showForm && !runningEntry ? tc("cancel") : <><Plus className="h-4 w-4" /> {tc("new")}</>}
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <TummyTimeForm entry={runningEntry} onDone={handleDone} />
        </Card>
      )}

      {!showForm && <TummyTimeList />}
    </div>
  );
}
