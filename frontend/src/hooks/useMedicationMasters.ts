/** React Query hooks for MedicationMaster CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMedicationMaster,
  deleteMedicationMaster,
  listMedicationMasters,
  updateMedicationMaster,
} from "../api/medicationMasters";
import type { MedicationMasterCreate, MedicationMasterUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const MED_MASTER_KEY = ["medication-masters"] as const;

export function useMedicationMasters(activeOnly = true) {
  return useQuery({
    queryKey: [...MED_MASTER_KEY, { activeOnly }],
    queryFn: () => listMedicationMasters(activeOnly),
  });
}

export function useCreateMedicationMaster() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: MedicationMasterCreate) => createMedicationMaster(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MED_MASTER_KEY });
      showToast("Medikament angelegt");
    },
  });
}

export function useUpdateMedicationMaster() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MedicationMasterUpdate }) =>
      updateMedicationMaster(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MED_MASTER_KEY });
      showToast("Medikament aktualisiert");
    },
  });
}

export function useDeleteMedicationMaster() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteMedicationMaster(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MED_MASTER_KEY });
      showToast("Medikament geloescht");
    },
  });
}
