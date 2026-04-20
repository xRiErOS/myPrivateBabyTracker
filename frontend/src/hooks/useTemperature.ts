/** React Query hooks for Temperature CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTemperature,
  deleteTemperature,
  listTemperature,
  updateTemperature,
  type TemperatureListParams,
} from "../api/temperature";
import type { TemperatureCreate, TemperatureUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const TEMPERATURE_KEY = ["temperature"] as const;

export function useTemperatureEntries(params: TemperatureListParams = {}) {
  return useQuery({
    queryKey: [...TEMPERATURE_KEY, params],
    queryFn: () => listTemperature(params),
    enabled: !!params.child_id,
  });
}

export function useCreateTemperature() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: TemperatureCreate) => createTemperature(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPERATURE_KEY });
      showToast("Temperatur gespeichert");
    },
  });
}

export function useUpdateTemperature() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TemperatureUpdate }) =>
      updateTemperature(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPERATURE_KEY });
      showToast("Temperatur aktualisiert");
    },
  });
}

export function useDeleteTemperature() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteTemperature(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPERATURE_KEY });
      showToast("Temperatur geloescht");
    },
  });
}
