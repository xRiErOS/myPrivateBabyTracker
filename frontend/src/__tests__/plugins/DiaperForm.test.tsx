/** Tests for DiaperForm — color selection, conditional fields. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DiaperForm } from "../../plugins/diaper/DiaperForm";

vi.mock("../../context/ChildContext", () => ({
  useActiveChild: () => ({
    activeChild: { id: 1, name: "Test Baby" },
    children: [],
    setActiveChild: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useDiaper", () => ({
  useCreateDiaper: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useUpdateDiaper: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
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
        <DiaperForm {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DiaperForm", () => {
  it("renders all base form fields", () => {
    renderForm();
    expect(screen.getByLabelText("Typ")).toBeInTheDocument();
    expect(screen.getByLabelText("Zeitpunkt")).toBeInTheDocument();
    expect(screen.getByText("Ausschlag vorhanden")).toBeInTheDocument();
    expect(screen.getByLabelText("Notizen")).toBeInTheDocument();
  });

  it("renders diaper type options", () => {
    renderForm();
    expect(screen.getByText("Nass")).toBeInTheDocument();
    expect(screen.getByText("Stuhl")).toBeInTheDocument();
    expect(screen.getByText("Gemischt")).toBeInTheDocument();
    expect(screen.getByText("Trocken")).toBeInTheDocument();
  });

  it("does not show color/consistency for wet type (default)", () => {
    renderForm();
    expect(screen.queryByText("Farbe")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Konsistenz")).not.toBeInTheDocument();
  });

  it("shows color buttons when dirty is selected", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Typ"), "dirty");
    expect(screen.getByText("Farbe")).toBeInTheDocument();
    expect(screen.getByText("Gelb")).toBeInTheDocument();
    expect(screen.getByText("Braun")).toBeInTheDocument();
    expect(screen.getByText("Gruen")).toBeInTheDocument();
  });

  it("shows consistency select when dirty is selected", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Typ"), "dirty");
    expect(screen.getByLabelText("Konsistenz")).toBeInTheDocument();
  });

  it("color buttons have 44px touch target", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Typ"), "dirty");
    const yellowBtn = screen.getByText("Gelb");
    expect(yellowBtn.className).toContain("min-h-[44px]");
  });

  it("can toggle rash checkbox", async () => {
    const user = userEvent.setup();
    renderForm();

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("renders submit button", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
  });
});
