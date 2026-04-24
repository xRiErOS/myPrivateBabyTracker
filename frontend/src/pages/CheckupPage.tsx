/** Checkup page — U-Untersuchungen tracking. */

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardCheck, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { CheckupForm } from "../plugins/checkup/CheckupForm";
import { CheckupList } from "../plugins/checkup/CheckupList";

export default function CheckupPage() {
  const { t } = useTranslation("checkup");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const [showForm, setShowForm] = useState(false);

  const handleDone = useCallback(() => setShowForm(false), []);
  const handleCancel = useCallback(() => setShowForm(false), []);

  if (!activeChild) {
    return (
      <EmptyState
        icon={ClipboardCheck}
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
          onClick={() => (showForm ? handleCancel() : setShowForm(true))}
          className="flex items-center gap-2"
        >
          {showForm ? tc("cancel") : <><Plus className="h-4 w-4" /> {tc("new")}</>}
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <CheckupForm onDone={handleDone} />
        </Card>
      )}

      {!showForm && <CheckupList />}
    </div>
  );
}
