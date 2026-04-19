/** Vitamin D3 toggle button — shows "Gegeben" or green checkmark. */

import { CheckCircle } from "lucide-react";
import { useCreateVitaminD3 } from "../../hooks/useVitaminD3";
import { todayBerlin } from "../../lib/timelineUtils";

interface VitaminD3ButtonProps {
  childId: number;
  givenToday: boolean;
}

export function VitaminD3Button({ childId, givenToday }: VitaminD3ButtonProps) {
  const createMut = useCreateVitaminD3();

  function handleClick() {
    if (givenToday) return;
    createMut.mutate({ child_id: childId, date: todayBerlin() });
  }

  return (
    <div className="bg-surface0 rounded-card p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="font-label font-semibold text-text text-sm">
          Vitamin D3
        </span>
        {givenToday ? (
          <div className="flex items-center gap-2 px-5 py-2.5">
            <CheckCircle size={20} className="text-green" />
            <span className="text-sm font-label font-semibold text-green">
              Gegeben
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={createMut.isPending}
            className="px-5 py-2.5 text-sm font-label font-semibold bg-green text-ground rounded-card hover:opacity-90 disabled:opacity-40 transition-all min-h-[44px]"
          >
            {createMut.isPending ? "..." : "Gegeben"}
          </button>
        )}
      </div>
    </div>
  );
}
