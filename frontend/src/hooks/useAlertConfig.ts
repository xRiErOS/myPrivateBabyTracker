/** React Query hooks for Alert Configuration. */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAlertConfig, updateAlertConfig } from "../api/alerts";
import type { AlertConfig } from "../api/types";

const KEY = ["alertConfig"] as const;

export function useAlertConfig(childId: number | undefined) {
  return useQuery({
    queryKey: [...KEY, childId],
    queryFn: () => getAlertConfig(childId!),
    enabled: !!childId,
  });
}

export function useUpdateAlertConfig(childId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AlertConfig>) => updateAlertConfig(childId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, childId] }),
  });
}
