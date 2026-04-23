/** Feeding page — new entry form + list with inline edit. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Utensils } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { FeedingForm } from "../plugins/feeding/FeedingForm";
import { FeedingList } from "../plugins/feeding/FeedingList";

export default function FeedingPage() {
  const { t } = useTranslation("feeding");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const cameFromDashboard = useRef(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      cameFromDashboard.current = true;
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
        icon={Utensils}
        title={tc("no_child_selected")}
        description={tc("no_child_selected_hint")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")}>
        <Button
          variant={showForm ? "danger" : "primary"}
          onClick={() => showForm ? handleCancel() : setShowForm(true)}
          className="flex items-center gap-2"
        >
          {showForm ? tc("cancel") : <><Plus className="h-4 w-4" /> {tc("new")}</>}
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <FeedingForm onDone={handleDone} />
        </Card>
      )}

      {!showForm && <FeedingList />}
    </div>
  );
}
