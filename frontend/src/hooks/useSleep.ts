/** React Query hooks for Sleep CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSleep,
  deleteSleep,
  getSleepChart,
  listSleep,
  updateSleep,
  type SleepListParams,
} from "../api/sleep";
import type { SleepCreate, SleepUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const SLEEP_KEY = ["sleep"] as const;

export function useSleepEntries(params: SleepListParams = {}) {
  return useQuery({
    queryKey: [...SLEEP_KEY, params],
    queryFn: () => listSleep(params),
    enabled: !!params.child_id,
  });
}

export function useCreateSleep() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: SleepCreate) => createSleep(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SLEEP_KEY });
      showToast("Schlaf gespeichert");
    },
  });
}

export function useUpdateSleep() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SleepUpdate }) =>
      updateSleep(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SLEEP_KEY });
      showToast("Schlaf aktualisiert");
    },
  });
}

export function useDeleteSleep() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteSleep(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SLEEP_KEY });
      showToast("Schlaf geloescht");
    },
  });
}

export function useSleepChart(childId?: number, days = 30) {
  return useQuery({
    queryKey: ["sleep-chart", childId, days],
    queryFn: () => getSleepChart(childId!, days),
    enabled: !!childId,
  });
}
