/** React Query hooks for API Key CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiKey, deleteApiKey, listApiKeys, updateApiKey } from "../api/apiKeys";
import type { ApiKeyCreate, ApiKeyUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const API_KEY_KEY = ["api-keys"] as const;

export function useApiKeys() {
  return useQuery({
    queryKey: [...API_KEY_KEY],
    queryFn: listApiKeys,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: ApiKeyCreate) => createApiKey(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: API_KEY_KEY });
      showToast("API-Key erstellt");
    },
  });
}

export function useUpdateApiKey() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApiKeyUpdate }) => updateApiKey(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: API_KEY_KEY });
      showToast("API-Key aktualisiert");
    },
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: API_KEY_KEY });
      showToast("API-Key geloescht");
    },
  });
}
