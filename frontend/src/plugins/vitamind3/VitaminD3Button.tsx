/** Vitamin D3 toggle button — shows "Gegeben" or green checkmark. */

import { CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCreateVitaminD3 } from "../../hooks/useVitaminD3";
import { todayBerlin } from "../../lib/timelineUtils";

interface VitaminD3ButtonProps {
  childId: number;
  givenToday: boolean;
}

export function VitaminD3Button({ childId, givenToday }: VitaminD3ButtonProps) {
  const { t } = useTranslation("vitamind3");
  const createMut = useCreateVitaminD3();

  function handleClick() {
    if (givenToday) return;
    createMut.mutate({ child_id: childId, date: todayBerlin() });
  }

  return (
    <div className="bg-surface0 rounded-card p-4 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <span className="font-label font-semibold text-text text-sm whitespace-nowrap">
          Vit. D3
        </span>
        {givenToday ? (
          <div className="flex items-center gap-1.5 px-3 py-2">
            <CheckCircle size={18} className="text-green flex-shrink-0" />
            <span className="text-sm font-label font-semibold text-green whitespace-nowrap">
              {t("given")}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={createMut.isPending}
            className="px-3 py-2 text-sm font-label font-semibold bg-green text-ground rounded-card hover:opacity-90 disabled:opacity-40 transition-all min-h-[44px] whitespace-nowrap"
          >
            {createMut.isPending ? "..." : t("give")}
          </button>
        )}
      </div>
    </div>
  );
}
