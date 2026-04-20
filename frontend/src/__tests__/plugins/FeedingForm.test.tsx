/** Tests for FeedingForm — type switch, field visibility. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { FeedingForm } from "../../plugins/feeding/FeedingForm";

vi.mock("../../context/ChildContext", () => ({
  useActiveChild: () => ({
    activeChild: { id: 1, name: "Test Baby" },
    children: [],
    setActiveChild: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useFeeding", () => ({
  useCreateFeeding: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useUpdateFeeding: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useFeedingEntries: () => ({
    data: [],
    isLoading: false,
  }),
}));

function renderForm(props = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FeedingForm {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("FeedingForm", () => {
  it("renders all base form fields", () => {
    renderForm();
    expect(screen.getByLabelText(/Typ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Zeitpunkt/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notizen/)).toBeInTheDocument();
  });

  it("renders feeding type options", () => {
    renderForm();
    expect(screen.getByText("Brust links")).toBeInTheDocument();
    expect(screen.getByText("Brust rechts")).toBeInTheDocument();
    expect(screen.getByText("Flasche")).toBeInTheDocument();
    expect(screen.getByText("Beikost")).toBeInTheDocument();
  });

  it("does not show amount field for breast feeding (default)", () => {
    renderForm();
    expect(screen.queryByLabelText(/Menge/)).not.toBeInTheDocument();
  });

  it("shows amount field when bottle is selected", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/Typ/), "bottle");
    expect(screen.getByLabelText(/Menge/)).toBeInTheDocument();
  });

  it("shows food type field when solid is selected", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/Typ/), "solid");
    expect(screen.getByLabelText(/Beikost/)).toBeInTheDocument();
  });

  it("hides amount field when switching from bottle to breast", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/Typ/), "bottle");
    expect(screen.getByLabelText(/Menge/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Typ/), "breast_left");
    expect(screen.queryByLabelText(/Menge/)).not.toBeInTheDocument();
  });

  it("renders submit button", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Nachtragen" })).toBeInTheDocument();
  });
});
