/** Tests for TodoForm — render, submit, edit mode. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { TodoForm } from "../../plugins/todo/TodoForm";

vi.mock("../../context/ChildContext", () => ({
  useActiveChild: () => ({
    activeChild: { id: 1, name: "Test Baby" },
    children: [],
    setActiveChild: vi.fn(),
    isLoading: false,
  }),
}));

const mockCreateMutateAsync = vi.fn().mockResolvedValue({});
const mockUpdateMutateAsync = vi.fn().mockResolvedValue({});

vi.mock("../../hooks/useTodos", () => ({
  useCreateTodo: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateTodo: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
}));

function renderForm(props = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TodoForm onDone={vi.fn()} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TodoForm", () => {
  it("renders all form fields", () => {
    renderForm();
    expect(screen.getByLabelText(/Titel/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Details/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Faellig/)).toBeInTheDocument();
  });

  it("shows 'Nachtragen' button for new entry", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /Nachtragen/ })).toBeInTheDocument();
  });

  it("shows 'Aktualisieren' button for edit mode", () => {
    const entry = {
      id: 1,
      child_id: 1,
      title: "U4",
      details: null,
      due_date: null,
      is_done: false,
      completed_at: null,
      created_at: "2026-04-20T10:00:00Z",
    };
    renderForm({ entry });
    expect(screen.getByRole("button", { name: /Aktualisieren/ })).toBeInTheDocument();
  });

  it("submits create with correct data", async () => {
    const onDone = vi.fn();
    renderForm({ onDone });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Titel/), "Impfung U4");
    await user.click(screen.getByRole("button", { name: /Nachtragen/ }));

    expect(mockCreateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        child_id: 1,
        title: "Impfung U4",
      }),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it("pre-fills fields in edit mode", () => {
    const entry = {
      id: 1,
      child_id: 1,
      title: "Gewicht messen",
      details: "Beim naechsten Termin",
      due_date: null,
      is_done: false,
      completed_at: null,
      created_at: "2026-04-20T10:00:00Z",
    };
    renderForm({ entry });
    expect(screen.getByDisplayValue("Gewicht messen")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Beim naechsten Termin")).toBeInTheDocument();
  });
});
