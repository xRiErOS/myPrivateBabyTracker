/** Vitamin D3 dashboard widget — button + calendar for current month. */

import { useActiveChild } from "../../context/ChildContext";
import { useVitaminD3Entries, useCreateVitaminD3, useDeleteVitaminD3 } from "../../hooks/useVitaminD3";
import { todayBerlin } from "../../lib/timelineUtils";
import { VitaminD3Button } from "./VitaminD3Button";
import { D3Calendar } from "./D3Calendar";

export function VitaminD3Widget() {
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
  const givenToday = entries.some((e) => e.date === today);

  function handleDayClick(date: string, isGiven: boolean, entryId?: number) {
    if (isGiven && entryId) {
      deleteMut.mutate(entryId);
    } else if (!isGiven) {
      createMut.mutate({ child_id: activeChild!.id, date });
    }
  }

  return (
    <div className="space-y-2">
      <VitaminD3Button childId={activeChild.id} givenToday={givenToday} />
      <D3Calendar entries={entries} onDayClick={handleDayClick} />
    </div>
  );
}
