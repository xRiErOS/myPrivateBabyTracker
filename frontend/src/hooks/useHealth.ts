/** React Query hooks for Health CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHealth,
  deleteHealth,
  listHealth,
  updateHealth,
  type HealthListParams,
} from "../api/health";
import type { HealthCreate, HealthUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const HEALTH_KEY = ["health"] as const;

export function useHealthEntries(params: HealthListParams = {}) {
  return useQuery({
    queryKey: [...HEALTH_KEY, params],
    queryFn: () => listHealth(params),
    enabled: !!params.child_id,
  });
}

export function useCreateHealth() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: HealthCreate) => createHealth(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HEALTH_KEY });
      showToast("Eintrag gespeichert");
    },
  });
}

export function useUpdateHealth() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: HealthUpdate }) =>
      updateHealth(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HEALTH_KEY });
      showToast("Eintrag aktualisiert");
    },
  });
}

export function useDeleteHealth() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteHealth(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HEALTH_KEY });
      showToast("Eintrag geloescht");
    },
  });
}
