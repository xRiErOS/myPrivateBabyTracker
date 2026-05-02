/** React Query hooks for Diaper CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDiaper,
  deleteDiaper,
  listDiapers,
  updateDiaper,
  type DiaperListParams,
} from "../api/diaper";
import type { DiaperCreate, DiaperUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const DIAPER_KEY = ["diaper"] as const;

export function useDiaperEntries(params: DiaperListParams = {}) {
  return useQuery({
    queryKey: [...DIAPER_KEY, params],
    queryFn: () => listDiapers(params),
    enabled: !!params.child_id,
  });
}

export function useCreateDiaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DiaperCreate) => createDiaper(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DIAPER_KEY });
    },
  });
}

export function useUpdateDiaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DiaperUpdate }) =>
      updateDiaper(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DIAPER_KEY });
    },
  });
}

export function useDeleteDiaper() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteDiaper(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DIAPER_KEY });
      showToast("Windel gelöscht");
    },
  });
}
