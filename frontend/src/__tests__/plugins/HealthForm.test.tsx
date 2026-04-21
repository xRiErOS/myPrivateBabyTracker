/** Tests for HealthForm — render, submit, duration visibility. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { HealthForm } from "../../plugins/health/HealthForm";

// Mock the child context
vi.mock("../../context/ChildContext", () => ({
  useActiveChild: () => ({
    activeChild: { id: 1, name: "Test Baby" },
    children: [],
    setActiveChild: vi.fn(),
    isLoading: false,
  }),
}));

// Mock the health hooks
const mockCreateMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
const mockUpdateMutateAsync = vi.fn().mockResolvedValue({ id: 1 });

vi.mock("../../hooks/useHealth", () => ({
  useCreateHealth: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateHealth: () => ({
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
        <HealthForm {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("HealthForm", () => {
  it("renders entry type buttons", () => {
    renderForm();
    expect(screen.getByText("Spucken")).toBeInTheDocument();
    expect(screen.getByText("Bauchschmerzen")).toBeInTheDocument();
  });

  it("renders severity buttons", () => {
    renderForm();
    expect(screen.getByText("Wenig")).toBeInTheDocument();
    expect(screen.getByText("Mittel")).toBeInTheDocument();
    expect(screen.getByText("Stark")).toBeInTheDocument();
  });

  it("does not show duration for spit_up by default", () => {
    renderForm();
    expect(screen.queryByText("Kurz (~1h)")).not.toBeInTheDocument();
  });

  it("shows duration when Bauchschmerzen is selected", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText("Bauchschmerzen"));
    expect(screen.getByText("Kurz (~1h)")).toBeInTheDocument();
    expect(screen.getByText("Mittel (1-2h)")).toBeInTheDocument();
    expect(screen.getByText("Lang (>2h)")).toBeInTheDocument();
  });

  it("hides duration when switching back to Spucken", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText("Bauchschmerzen"));
    expect(screen.getByText("Kurz (~1h)")).toBeInTheDocument();

    await user.click(screen.getByText("Spucken"));
    expect(screen.queryByText("Kurz (~1h)")).not.toBeInTheDocument();
  });

  it("renders submit button with correct text for new entry", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Eintragen" })).toBeInTheDocument();
  });

  it("renders submit button with 'Aktualisieren' for edit", () => {
    const entry = {
      id: 1,
      child_id: 1,
      entry_type: "spit_up" as const,
      severity: "mild" as const,
      duration: null,
      time: "2026-04-19T10:00:00Z",
      notes: null,
      created_at: "2026-04-19T10:00:00Z",
    };
    renderForm({ entry });
    expect(screen.getByRole("button", { name: "Aktualisieren" })).toBeInTheDocument();
  });

  it("has min-h-[44px] on submit button for touch target", () => {
    renderForm();
    const btn = screen.getByRole("button", { name: "Eintragen" });
    expect(btn.className).toContain("min-h-[44px]");
  });

  it("calls createMutateAsync on submit", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    renderForm({ onDone });

    await user.click(screen.getByRole("button", { name: "Eintragen" }));
    expect(mockCreateMutateAsync).toHaveBeenCalled();
  });
});
