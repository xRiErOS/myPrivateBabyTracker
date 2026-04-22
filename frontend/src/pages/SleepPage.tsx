/** Sleep page — new entry form + list with inline edit, auto-opens running sleep. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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

export default function SleepPage() {
  const { t } = useTranslation("sleep");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);

  const { data: entries } = useSleepEntries({
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
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDone = useCallback(() => {
    setShowForm(false);
  }, []);

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
        <Button
          variant={showForm && !runningEntry ? "danger" : "primary"}
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          {showForm && !runningEntry ? tc("cancel") : <><Plus className="h-4 w-4" /> {tc("new")}</>}
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <SleepForm entry={runningEntry} onDone={handleDone} />
        </Card>
      )}

      {!showForm && <SleepList />}
    </div>
  );
}
