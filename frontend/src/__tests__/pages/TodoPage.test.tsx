/** Tests for TodoPage — tab navigation via URL query (Backlog #186). */

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import TodoPage from "../../pages/TodoPage";

vi.mock("../../context/ChildContext", () => ({
  useActiveChild: () => ({
    activeChild: { id: 1, name: "Test Baby" },
    children: [],
    setActiveChild: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useTodos", () => ({
  useTodos: () => ({ data: [], isLoading: false }),
  useHabits: () => ({ data: [], isLoading: false }),
  useCreateTodo: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTodo: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTodo: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateHabit: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateHabit: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteHabit: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCompleteHabit: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUncompleteHabit: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTemplates: () => ({ data: [], isLoading: false }),
  useCreateTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCloneTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function renderPage(initialPath: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <TodoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TodoPage — tab via URL query", () => {
  it("activates Habits tab when ?tab=habits is in URL", async () => {
    renderPage("/todo?tab=habits");

    await waitFor(() => {
      const habitsBtn = screen.getByRole("button", { name: /Habits/i });
      expect(habitsBtn.className).toContain("bg-peach");
    });
  });

  it("activates Templates tab when ?tab=templates is in URL", async () => {
    renderPage("/todo?tab=templates");

    await waitFor(() => {
      const tplBtn = screen.getByRole("button", { name: /Vorlagen|Templates/i });
      expect(tplBtn.className).toContain("bg-peach");
    });
  });

  it("defaults to Tasks tab when no tab query is set", async () => {
    renderPage("/todo");

    await waitFor(() => {
      const tasksBtn = screen.getByRole("button", { name: /Aufgaben|Tasks/i });
      expect(tasksBtn.className).toContain("bg-peach");
    });
  });
});
