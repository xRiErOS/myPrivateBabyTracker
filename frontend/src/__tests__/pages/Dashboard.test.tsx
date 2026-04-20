/** Tests for Dashboard — view tabs, quick actions, summary tiles. */

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "../../pages/Dashboard";

// Mock child context with an active child
vi.mock("../../context/ChildContext", () => ({
  useActiveChild: () => ({
    activeChild: { id: 1, name: "Test Baby", birth_date: "2025-01-01", notes: null, is_active: true, created_at: "2025-01-01T00:00:00Z" },
    children: [],
    setActiveChild: vi.fn(),
    isLoading: false,
  }),
}));

// Mock dashboard data hook
vi.mock("../../hooks/useDashboardData", () => ({
  useDashboardData: () => ({
    data: { feedings: [], diapers: [], sleeps: [] },
    isLoading: false,
  }),
}));

// Mock VitaminD3 hooks
vi.mock("../../hooks/useVitaminD3", () => ({
  useVitaminD3Entries: () => ({ data: [], isLoading: false }),
  useCreateVitaminD3: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteVitaminD3: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Mock ToastContext
vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

function renderDashboard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Dashboard", () => {
  it("renders child name", () => {
    renderDashboard();
    expect(screen.getByText("Test Baby")).toBeInTheDocument();
  });

  it("renders view tabs", () => {
    renderDashboard();
    expect(screen.getByText("Heute")).toBeInTheDocument();
    expect(screen.getByText("7 Tage")).toBeInTheDocument();
    expect(screen.getByText("14 Tage")).toBeInTheDocument();
  });

  it("renders quick action buttons", () => {
    renderDashboard();
    const buttons = screen.getAllByRole("button");
    const buttonTexts = buttons.map((b) => b.textContent);
    expect(buttonTexts.some((t) => t?.includes("Schlaf"))).toBe(true);
    expect(buttonTexts.some((t) => t?.includes("Mahlzeiten"))).toBe(true);
    expect(buttonTexts.some((t) => t?.includes("Windel"))).toBe(true);
  });

  it("renders summary tiles in today view", () => {
    renderDashboard();
    expect(screen.getByText("Stillseite")).toBeInTheDocument();
    expect(screen.getByText("Heute gesamt")).toBeInTheDocument();
    expect(screen.getByText("Windeln heute")).toBeInTheDocument();
    expect(screen.getAllByText("Schlaf").length).toBeGreaterThan(0);
  });

  it("renders VitaminD3 tile", () => {
    renderDashboard();
    expect(screen.getByText("Vit. D3")).toBeInTheDocument();
  });
});
