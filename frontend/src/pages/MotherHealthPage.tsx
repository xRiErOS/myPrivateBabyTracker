/** MotherHealthPage — Wochenbett / Hebammen-Notizen (MBT-109).
 *
 * Privacy-first: optionales Plugin, standardmaessig deaktiviert. Nur ueber das
 * Burger-Menue erreichbar wenn aktiviert. Kein Dashboard-Widget.
 */

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { HeartPulse, Lock, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { MotherHealthForm } from "../plugins/motherhealth/MotherHealthForm";
import { MotherHealthList } from "../plugins/motherhealth/MotherHealthList";

export default function MotherHealthPage() {
  const { t } = useTranslation("motherhealth");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const [showForm, setShowForm] = useState(false);

  const handleDone = useCallback(() => setShowForm(false), []);
  const handleCancel = useCallback(() => setShowForm(false), []);

  if (!activeChild) {
    return (
      <EmptyState
        icon={HeartPulse}
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
          {showForm ? (
            tc("cancel")
          ) : (
            <>
              <Plus className="h-4 w-4" /> {tc("new")}
            </>
          )}
        </Button>
      </PageHeader>

      <div className="flex items-start gap-2 rounded-lg border border-mauve/30 bg-mauve/5 px-3 py-2">
        <Lock className="h-4 w-4 text-mauve mt-0.5 shrink-0" />
        <p className="font-body text-xs text-subtext0 leading-relaxed">
          {t("privacy_hint")}
        </p>
      </div>

      {showForm && (
        <Card>
          <MotherHealthForm onDone={handleDone} />
        </Card>
      )}

      {!showForm && <MotherHealthList />}
    </div>
  );
}
