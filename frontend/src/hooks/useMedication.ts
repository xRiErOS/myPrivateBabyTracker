/** React Query hooks for Medication CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMedication,
  deleteMedication,
  listMedication,
  updateMedication,
  type MedicationListParams,
} from "../api/medication";
import type { MedicationCreate, MedicationUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const MEDICATION_KEY = ["medication"] as const;

export function useMedicationEntries(params: MedicationListParams = {}) {
  return useQuery({
    queryKey: [...MEDICATION_KEY, params],
    queryFn: () => listMedication(params),
    enabled: !!params.child_id,
  });
}

export function useCreateMedication() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: MedicationCreate) => createMedication(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEDICATION_KEY });
      showToast("Medikament gespeichert");
    },
  });
}

export function useUpdateMedication() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MedicationUpdate }) =>
      updateMedication(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEDICATION_KEY });
      showToast("Medikament aktualisiert");
    },
  });
}

export function useDeleteMedication() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteMedication(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEDICATION_KEY });
      showToast("Medikament geloescht");
    },
  });
}
