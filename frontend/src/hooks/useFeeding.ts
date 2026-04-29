/** React Query hooks for Feeding CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFeeding,
  deleteFeeding,
  listFeedings,
  updateFeeding,
  type FeedingListParams,
} from "../api/feeding";
import type { FeedingCreate, FeedingUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const FEEDING_KEY = ["feeding"] as const;

export function useFeedingEntries(params: FeedingListParams = {}) {
  return useQuery({
    queryKey: [...FEEDING_KEY, params],
    queryFn: () => listFeedings(params),
    enabled: !!params.child_id,
  });
}

export function useCreateFeeding() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: FeedingCreate) => createFeeding(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FEEDING_KEY });
      showToast("Mahlzeit gespeichert");
    },
  });
}

export function useUpdateFeeding() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: FeedingUpdate }) =>
      updateFeeding(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FEEDING_KEY });
      showToast("Mahlzeit aktualisiert");
    },
  });
}

export function useDeleteFeeding() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteFeeding(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FEEDING_KEY });
      showToast("Mahlzeit gelöscht");
    },
  });
}
