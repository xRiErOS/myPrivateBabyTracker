/** React Query hook for Growth chart data. */

import { useQuery } from "@tanstack/react-query";
import { getGrowthChart } from "../api/growth";

const GROWTH_KEY = ["growth"] as const;

export function useGrowthChart(childId: number | undefined) {
  return useQuery({
    queryKey: [...GROWTH_KEY, childId],
    queryFn: () => getGrowthChart(childId!),
    enabled: !!childId,
  });
}
