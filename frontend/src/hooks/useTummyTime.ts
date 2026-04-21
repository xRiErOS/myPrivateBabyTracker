/** React Query hooks for TummyTime CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTummyTime,
  deleteTummyTime,
  listTummyTime,
  updateTummyTime,
  type TummyTimeListParams,
} from "../api/tummytime";
import type { TummyTimeCreate, TummyTimeUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const TUMMY_TIME_KEY = ["tummy-time"] as const;

export function useTummyTimeEntries(params: TummyTimeListParams = {}) {
  return useQuery({
    queryKey: [...TUMMY_TIME_KEY, params],
    queryFn: () => listTummyTime(params),
    enabled: !!params.child_id,
  });
}

export function useCreateTummyTime() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: TummyTimeCreate) => createTummyTime(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TUMMY_TIME_KEY });
      showToast("Bauchlage gespeichert");
    },
  });
}

export function useUpdateTummyTime() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TummyTimeUpdate }) =>
      updateTummyTime(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TUMMY_TIME_KEY });
      showToast("Bauchlage aktualisiert");
    },
  });
}

export function useDeleteTummyTime() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteTummyTime(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TUMMY_TIME_KEY });
      showToast("Bauchlage geloescht");
    },
  });
}
