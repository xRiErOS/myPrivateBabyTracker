/** Tests for SleepForm — render, submit, start/stop buttons. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SleepForm } from "../../plugins/sleep/SleepForm";

// Mock the child context
vi.mock("../../context/ChildContext", () => ({
  useActiveChild: () => ({
    activeChild: { id: 1, name: "Test Baby" },
    children: [],
    setActiveChild: vi.fn(),
    isLoading: false,
  }),
}));

// Mock the sleep hooks
const mockCreateMutateAsync = vi.fn().mockResolvedValue({});
const mockUpdateMutateAsync = vi.fn().mockResolvedValue({});

vi.mock("../../hooks/useSleep", () => ({
  useCreateSleep: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateSleep: () => ({
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
        <SleepForm {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SleepForm", () => {
  it("renders all form fields", () => {
    renderForm();
    expect(screen.getByLabelText(/Typ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Beginn/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ende/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notizen/)).toBeInTheDocument();
  });

  it("renders sleep type options", () => {
    renderForm();
    const select = screen.getByLabelText(/Typ/);
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Nickerchen")).toBeInTheDocument();
    expect(screen.getByText("Nachtschlaf")).toBeInTheDocument();
  });

  it("shows 'Jetzt starten' button when no start time set", () => {
    renderForm();
    expect(screen.getByText("Jetzt starten")).toBeInTheDocument();
  });

  it("renders submit button with correct text for new entry", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Nachtragen" })).toBeInTheDocument();
  });

  it("renders submit button with 'Aktualisieren' for completed entry edit", () => {
    const entry = {
      id: 1,
      child_id: 1,
      start_time: "2026-04-19T10:00:00Z",
      end_time: "2026-04-19T12:00:00Z",
      duration_minutes: 120,
      sleep_type: "nap" as const,
      location: null,
      quality: null,
      notes: null,
      created_at: "2026-04-19T10:00:00Z",
    };
    renderForm({ entry });
    expect(screen.getByRole("button", { name: "Aktualisieren" })).toBeInTheDocument();
  });

  it("shows 'Jetzt stoppen' for running sleep entry", () => {
    const entry = {
      id: 1,
      child_id: 1,
      start_time: "2026-04-19T10:00:00Z",
      end_time: null,
      duration_minutes: null,
      sleep_type: "nap" as const,
      location: null,
      quality: null,
      notes: null,
      created_at: "2026-04-19T10:00:00Z",
    };
    renderForm({ entry });
    expect(screen.getByText("Jetzt stoppen")).toBeInTheDocument();
  });

  it("has min-h-[44px] on submit button for touch target", () => {
    renderForm();
    const btn = screen.getByRole("button", { name: "Nachtragen" });
    expect(btn.className).toContain("min-h-[44px]");
  });

  it("calls createMutateAsync on submit for new entry", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    renderForm({ onDone });

    // Click "Jetzt starten" to set start time
    await user.click(screen.getByText("Jetzt starten"));

    // Submit
    await user.click(screen.getByRole("button", { name: "Nachtragen" }));
    expect(mockCreateMutateAsync).toHaveBeenCalled();
  });
});
