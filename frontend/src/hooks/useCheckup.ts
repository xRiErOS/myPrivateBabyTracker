/** React Query hooks for Checkup CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCheckup,
  deleteCheckup,
  getNextCheckup,
  listCheckups,
  listCheckupTypes,
  updateCheckup,
  type CheckupCreate,
  type CheckupUpdate,
} from "../api/checkup";
import { useToast } from "../context/ToastContext";

const CHECKUP_KEY = ["checkup"] as const;

export function useCheckupTypes() {
  return useQuery({
    queryKey: [...CHECKUP_KEY, "types"],
    queryFn: () => listCheckupTypes(),
  });
}

export function useCheckupEntries(childId: number | undefined) {
  return useQuery({
    queryKey: [...CHECKUP_KEY, childId],
    queryFn: () => listCheckups(childId),
    enabled: !!childId,
  });
}

export function useNextCheckup(childId: number | undefined) {
  return useQuery({
    queryKey: [...CHECKUP_KEY, "next", childId],
    queryFn: () => getNextCheckup(childId!),
    enabled: !!childId,
  });
}

export function useCreateCheckup() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: CheckupCreate) => createCheckup(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHECKUP_KEY });
      showToast("U-Untersuchung gespeichert");
    },
  });
}

export function useUpdateCheckup() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CheckupUpdate }) =>
      updateCheckup(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHECKUP_KEY });
      showToast("U-Untersuchung aktualisiert");
    },
  });
}

export function useDeleteCheckup() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteCheckup(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHECKUP_KEY });
      showToast("U-Untersuchung gelöscht");
    },
  });
}
