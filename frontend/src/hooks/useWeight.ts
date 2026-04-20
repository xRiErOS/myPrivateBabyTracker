/** React Query hooks for Weight CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWeight,
  deleteWeight,
  listWeight,
  updateWeight,
  type WeightListParams,
} from "../api/weight";
import type { WeightCreate, WeightUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const WEIGHT_KEY = ["weight"] as const;

export function useWeightEntries(params: WeightListParams = {}) {
  return useQuery({
    queryKey: [...WEIGHT_KEY, params],
    queryFn: () => listWeight(params),
    enabled: !!params.child_id,
  });
}

export function useCreateWeight() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: WeightCreate) => createWeight(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WEIGHT_KEY });
      showToast("Gewicht gespeichert");
    },
  });
}

export function useUpdateWeight() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WeightUpdate }) =>
      updateWeight(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WEIGHT_KEY });
      showToast("Gewicht aktualisiert");
    },
  });
}

export function useDeleteWeight() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteWeight(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WEIGHT_KEY });
      showToast("Gewicht geloescht");
    },
  });
}
