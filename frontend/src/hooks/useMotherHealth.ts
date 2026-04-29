/** React Query hooks for MotherHealth CRUD (MBT-109). */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMotherHealthEntry,
  deleteMotherHealthEntry,
  listMotherHealthEntries,
  updateMotherHealthEntry,
  type MotherHealthCreate,
  type MotherHealthUpdate,
} from "../api/motherhealth";
import { useToast } from "../context/ToastContext";

const KEY = ["motherhealth"] as const;

export function useMotherHealthEntries(childId: number | undefined) {
  return useQuery({
    queryKey: [...KEY, childId],
    queryFn: () => listMotherHealthEntries(childId),
    enabled: !!childId,
  });
}

export function useCreateMotherHealthEntry() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: MotherHealthCreate) => createMotherHealthEntry(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      showToast("Notiz gespeichert");
    },
  });
}

export function useUpdateMotherHealthEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MotherHealthUpdate }) =>
      updateMotherHealthEntry(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteMotherHealthEntry() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteMotherHealthEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      showToast("Notiz gelöscht");
    },
  });
}
