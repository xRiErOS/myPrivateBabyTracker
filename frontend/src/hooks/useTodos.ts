/** React Query hooks for Todo CRUD + Templates + Habits. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTodo, deleteTodo, listTodos, updateTodo,
  listTemplates, createTemplate, updateTemplate, deleteTemplate, cloneTemplate,
  listHabits, createHabit, updateHabit, deleteHabit, completeHabit, uncompleteHabit,
} from "../api/todo";
import type { TodoCreate, TodoUpdate, TodoTemplateCreate, TodoTemplateUpdate, HabitCreate, HabitUpdate } from "../api/types";
import { useToast } from "../context/ToastContext";

const TODO_KEY = ["todos"] as const;
const TEMPLATE_KEY = ["todo-templates"] as const;

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

// --- Template hooks ---

export function useTemplates(childId?: number, activeOnly = true) {
  return useQuery({
    queryKey: [...TEMPLATE_KEY, { childId, activeOnly }],
    queryFn: () => listTemplates(childId, activeOnly),
    enabled: childId != null,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: TodoTemplateCreate) => createTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATE_KEY });
      showToast("Vorlage angelegt");
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TodoTemplateUpdate }) => updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATE_KEY });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATE_KEY });
      showToast("Vorlage geloescht");
    },
  });
}

export function useCloneTemplate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => cloneTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODO_KEY });
      showToast("ToDo aus Vorlage erstellt");
    },
  });
}

// --- Habit hooks ---

const HABIT_KEY = ["habits"] as const;

export function useHabits(childId?: number, activeOnly = true) {
  return useQuery({
    queryKey: [...HABIT_KEY, { childId, activeOnly }],
    queryFn: () => listHabits(childId, activeOnly),
    enabled: childId != null,
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: HabitCreate) => createHabit(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABIT_KEY });
      showToast("Habit angelegt");
    },
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: HabitUpdate }) => updateHabit(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABIT_KEY });
    },
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteHabit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABIT_KEY });
      showToast("Habit geloescht");
    },
  });
}

export function useCompleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => completeHabit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABIT_KEY });
    },
  });
}

export function useUncompleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => uncompleteHabit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABIT_KEY });
    },
  });
}
