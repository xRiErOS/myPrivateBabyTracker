/** React Query hooks for Alerts. */

import { useQuery } from "@tanstack/react-query";
import { getActiveAlerts } from "../api/alerts";

const ALERTS_KEY = ["alerts"] as const;

export function useActiveAlerts(childId: number | undefined) {
  return useQuery({
    queryKey: [...ALERTS_KEY, childId],
    queryFn: () => getActiveAlerts(childId!),
    enabled: !!childId,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 minutes
  });
}
