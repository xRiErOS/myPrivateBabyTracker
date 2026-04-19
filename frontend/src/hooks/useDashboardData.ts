/** Combined dashboard data hook — fetches feedings, diapers, sleeps for a date range. */

import { useQuery } from "@tanstack/react-query";
import { listFeedings } from "../api/feeding";
import { listDiapers } from "../api/diaper";
import { listSleep } from "../api/sleep";
import { berlinDayBounds, todayBerlin } from "../lib/timelineUtils";
import type { FeedingEntry, DiaperEntry, SleepEntry } from "../api/types";

export interface DashboardData {
  feedings: FeedingEntry[];
  diapers: DiaperEntry[];
  sleeps: SleepEntry[];
}

/**
 * Fetch all dashboard data for a child within a date range.
 * @param daysBack Number of days to look back (1 = today only, 7, 14, etc.)
 */
export function useDashboardData(childId: number, daysBack: number) {
  const today = todayBerlin();
  const startDate = new Date(
    Date.now() - (daysBack - 1) * 86400000,
  ).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

  const { min: dateFrom } = berlinDayBounds(startDate);
  const { max: dateTo } = berlinDayBounds(today);

  return useQuery<DashboardData>({
    queryKey: ["dashboard", childId, daysBack],
    queryFn: async () => {
      const [feedings, diapers, sleeps] = await Promise.all([
        listFeedings({ child_id: childId, date_from: dateFrom, date_to: dateTo }),
        listDiapers({ child_id: childId, date_from: dateFrom, date_to: dateTo }),
        listSleep({ child_id: childId, date_from: dateFrom, date_to: dateTo }),
      ]);
      return { feedings, diapers, sleeps };
    },
    enabled: !!childId,
    refetchInterval: 60000,
  });
}
