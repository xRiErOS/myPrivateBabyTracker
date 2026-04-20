/** Vitamin D3 dashboard widget — card showing today's status with give/undo button. */

import { Sun, CheckCircle, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import {
  useVitaminD3Entries,
  useCreateVitaminD3,
  useDeleteVitaminD3,
} from "../../hooks/useVitaminD3";
import { todayBerlin } from "../../lib/timelineUtils";

export function VitaminD3Widget() {
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: entries = [] } = useVitaminD3Entries({
    child_id: activeChild?.id,
    month,
  });

  const createMut = useCreateVitaminD3();
  const deleteMut = useDeleteVitaminD3();

  if (!activeChild) return null;

  const today = todayBerlin();
  const todayEntry = entries.find((e) => e.date === today);
  const givenToday = !!todayEntry;

  // Calculate days since last given (excluding today)
  const lastEntry = entries
    .filter((e) => e.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  function subLabel(): string {
    if (givenToday) return "Heute gegeben";
    if (lastEntry) {
      const diffMs = new Date(today).getTime() - new Date(lastEntry.date).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) return "Zuletzt: gestern";
      return `Zuletzt: vor ${diffDays} Tagen`;
    }
    return "Noch nie gegeben";
  }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (givenToday && todayEntry) {
      deleteMut.mutate(todayEntry.id);
    } else {
      createMut.mutate({ child_id: activeChild!.id, date: today });
    }
  }

  return (
    <Card
      className="h-full flex flex-col gap-2 p-3 cursor-pointer active:bg-surface1 transition-colors"
      onClick={() => navigate("/vitamind3")}
    >
      <div className="flex items-center gap-2">
        <Sun className="h-4 w-4 text-overlay0" />
        <span className="font-label text-xs text-overlay0">Vit. D3</span>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={`font-heading text-lg font-semibold whitespace-nowrap ${
            givenToday ? "text-green" : "text-peach"
          }`}
        >
          {givenToday ? "Gegeben" : "Ausstehend"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-body text-xs text-overlay0">{subLabel()}</p>
        <button
          type="button"
          onClick={handleToggle}
          disabled={createMut.isPending || deleteMut.isPending}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-label font-semibold rounded-card min-h-[32px] transition-all disabled:opacity-40 ${
            givenToday
              ? "bg-surface1 text-subtext0 hover:bg-surface2"
              : "bg-green text-ground hover:opacity-90"
          }`}
        >
          {givenToday ? (
            <Pencil className="h-3 w-3" />
          ) : (
            <>
              <CheckCircle className="h-3 w-3" />
              Geben
            </>
          )}
        </button>
      </div>
    </Card>
  );
}
