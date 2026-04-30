/** React Query hooks für MotherHealth (MBT-109 + strukturierte Typen). */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMotherHealthEntry,
  deleteMotherHealthEntry,
  listMotherHealthEntries,
  updateMotherHealthEntry,
  type EntryType,
  type MotherHealthCreate,
  type MotherHealthUpdate,
} from "../api/motherhealth";
import { useToast } from "../context/ToastContext";

const KEY = ["motherhealth"] as const;

export function useMotherHealthEntries(
  childId: number | undefined,
  entryType?: EntryType,
) {
  return useQuery({
    queryKey: [...KEY, childId, entryType ?? "all"],
    queryFn: () => listMotherHealthEntries(childId, entryType),
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
      showToast("Eintrag gespeichert");
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
      showToast("Eintrag gelöscht");
    },
  });
}
