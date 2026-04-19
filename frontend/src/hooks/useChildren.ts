/** React Query hooks for Children CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChild,
  deleteChild,
  listChildren,
  updateChild,
} from "../api/children";
import type { ChildCreate, ChildUpdate } from "../api/types";

const CHILDREN_KEY = ["children"] as const;

export function useChildren() {
  return useQuery({
    queryKey: CHILDREN_KEY,
    queryFn: listChildren,
  });
}

export function useCreateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ChildCreate) => createChild(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHILDREN_KEY }),
  });
}

export function useUpdateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ChildUpdate }) =>
      updateChild(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHILDREN_KEY }),
  });
}

export function useDeleteChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteChild(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHILDREN_KEY }),
  });
}
