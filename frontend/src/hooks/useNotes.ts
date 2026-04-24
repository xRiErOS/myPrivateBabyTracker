/** React Query hooks for Notes CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNote, deleteNote, listNotes, updateNote, type NoteCreate, type NoteUpdate } from "../api/notes";
import { useToast } from "../context/ToastContext";

const NOTES_KEY = ["notes"] as const;

export function useNotes(childId: number | undefined) {
  return useQuery({
    queryKey: [...NOTES_KEY, childId],
    queryFn: () => listNotes(childId),
    enabled: !!childId,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: NoteCreate) => createNote(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
      showToast("Notiz gespeichert");
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: NoteUpdate }) => updateNote(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
      showToast("Notiz aktualisiert");
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
      showToast("Notiz geloescht");
    },
  });
}
