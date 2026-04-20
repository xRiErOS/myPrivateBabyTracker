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
    expect(screen.getByLabelText(/Typ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Zeitpunkt/)).toBeInTheDocument();
    expect(screen.getByText("Ausschlag vorhanden")).toBeInTheDocument();
    expect(screen.getByLabelText(/Notizen/)).toBeInTheDocument();
  });

  it("renders diaper type options", () => {
    renderForm();
    expect(screen.getByText("Nass")).toBeInTheDocument();
    expect(screen.getByText("Stuhl")).toBeInTheDocument();
    expect(screen.getByText("Gemischt")).toBeInTheDocument();
    expect(screen.getByText("Trocken")).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Eintragen" })).toBeInTheDocument();
  });
});
