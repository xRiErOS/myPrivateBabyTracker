/** Weight dashboard widget — shows latest measurement + trend. */

import { useTranslation } from "react-i18next";
import { Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import { useWeightEntries } from "../../hooks/useWeight";
import { formatTimeSince } from "../../lib/dateUtils";

function formatWeight(grams: number): string {
  const kg = grams / 1000;
  return `${kg.toFixed(2)} kg`;
}

export function WeightWidget() {
  const { t } = useTranslation("weight");
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const { data: entries = [] } = useWeightEntries({
    child_id: activeChild?.id,
  });

  const latest = entries[0];
  const previous = entries[1];

  const trend = latest && previous
    ? latest.weight_grams - previous.weight_grams
    : null;

  return (
    <Card className="h-full flex flex-col gap-2 p-3 cursor-pointer active:bg-surface1 transition-colors" onClick={() => navigate("/weight")}>
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-overlay0" />
        <span className="font-label text-xs text-overlay0">{t("widget_title")}</span>
      </div>

      {latest ? (
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-lg font-semibold text-text">
            {formatWeight(latest.weight_grams)}
          </span>
          {trend !== null && (
            <span className={`font-body text-xs ${trend >= 0 ? "text-green" : "text-peach"}`}>
              {trend >= 0 ? "+" : ""}{(trend / 1000).toFixed(2)} kg
            </span>
          )}
        </div>
      ) : (
        <p className="font-body text-sm text-overlay0">{t("no_measurement")}</p>
      )}

      {latest && (
        <p className="font-body text-xs text-overlay0">
          {formatTimeSince(latest.measured_at)}
        </p>
      )}
    </Card>
  );
}
