/** React Query hooks for Todo CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTodo, deleteTodo, listTodos, updateTodo } from "../api/todo";
import type { TodoCreate, TodoUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const TODO_KEY = ["todos"] as const;

export function useTodos(childId?: number, showDone = true) {
  return useQuery({
    queryKey: [...TODO_KEY, { childId, showDone }],
    queryFn: () => listTodos(childId, showDone),
    enabled: childId != null,
  });
}

export function useCreateTodo() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: TodoCreate) => createTodo(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODO_KEY });
      showToast("ToDo angelegt");
    },
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TodoUpdate }) => updateTodo(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODO_KEY });
    },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteTodo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODO_KEY });
      showToast("ToDo geloescht");
    },
  });
}
