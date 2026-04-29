/** React Query hooks for VitaminD3 CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVitaminD3,
  listVitaminD3,
  deleteVitaminD3,
  type VitaminD3ListParams,
} from "../api/vitamind3";
import type { VitaminD3Create } from "../api/types";
import { useToast } from "../context/ToastContext";

const D3_KEY = ["vitamind3"] as const;

export function useVitaminD3Entries(params: VitaminD3ListParams = {}) {
  return useQuery({
    queryKey: [...D3_KEY, params],
    queryFn: () => listVitaminD3(params),
    enabled: !!params.child_id,
  });
}

export function useCreateVitaminD3() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: VitaminD3Create) => createVitaminD3(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: D3_KEY });
      showToast("Vitamin D3 erfasst");
    },
  });
}

export function useDeleteVitaminD3() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteVitaminD3(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: D3_KEY });
      showToast("Vitamin D3 Eintrag gelöscht");
    },
  });
}
