/** React Query hook for Growth chart data. */

import { useQuery } from "@tanstack/react-query";
import { getGrowthChart, type GrowthMetric } from "../api/growth";

const GROWTH_KEY = ["growth"] as const;

export function useGrowthChart(
  childId: number | undefined,
  metric: GrowthMetric = "weight"
) {
  return useQuery({
    queryKey: [...GROWTH_KEY, childId, metric],
    queryFn: () => getGrowthChart(childId!, metric),
    enabled: !!childId,
  });
}
