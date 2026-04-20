/** React Query hooks for Tag CRUD and entry-tag associations. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attachTag, createTag, deleteTag, detachTag, listEntryTags, listTags, updateTag } from "../api/tags";
import type { EntryTagCreate, TagCreate, TagUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const TAG_KEY = ["tags"] as const;
const ENTRY_TAG_KEY = ["entry-tags"] as const;

export function useTags(childId?: number) {
  return useQuery({
    queryKey: [...TAG_KEY, { childId }],
    queryFn: () => listTags(childId),
    enabled: childId != null,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: TagCreate) => createTag(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TAG_KEY });
      showToast("Tag angelegt");
    },
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TagUpdate }) => updateTag(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TAG_KEY });
      showToast("Tag aktualisiert");
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TAG_KEY });
      showToast("Tag geloescht");
    },
  });
}

export function useEntryTags(entryType: string, entryId?: number) {
  return useQuery({
    queryKey: [...ENTRY_TAG_KEY, entryType, entryId],
    queryFn: () => listEntryTags(entryType, entryId),
    enabled: entryId != null,
  });
}

export function useAttachTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EntryTagCreate) => attachTag(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENTRY_TAG_KEY });
    },
  });
}

export function useDetachTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => detachTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENTRY_TAG_KEY });
    },
  });
}
