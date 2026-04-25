/** Tests for AlertBell — badge visibility and dropdown interaction. */

import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AlertBell } from "../../components/AlertBell";

vi.mock("../../context/ChildContext", () => ({
  useActiveChild: () => ({
    activeChild: { id: 1, name: "Test Baby", birth_date: "2025-01-01" },
  }),
}));

const mockAlerts = {
  alerts: [
    { type: "fever", severity: "critical", message: "Fieber über 38.5°C gemessen" },
    { type: "wet_diaper", severity: "warning", message: "Weniger als 5 nasse Windeln heute" },
  ],
};

function renderBell() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AlertBell />
    </QueryClientProvider>
  );
}

describe("AlertBell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders bell button", () => {
    vi.mock("../../hooks/useAlerts", () => ({
      useActiveAlerts: () => ({ data: null }),
    }));
    renderBell();
    expect(screen.getByRole("button", { name: /warnungen/i })).toBeInTheDocument();
  });

  it("shows red badge when active alerts exist", async () => {
    vi.doMock("../../hooks/useAlerts", () => ({
      useActiveAlerts: () => ({ data: mockAlerts }),
    }));
    const { container } = renderBell();
    // badge is a span with bg-red class
    const badge = container.querySelector(".bg-red");
    expect(badge).toBeInTheDocument();
  });

  it("opens dropdown on bell click", async () => {
    vi.doMock("../../hooks/useAlerts", () => ({
      useActiveAlerts: () => ({ data: mockAlerts }),
    }));
    renderBell();
    const bell = screen.getByRole("button", { name: /warnungen/i });
    fireEvent.click(bell);
    expect(screen.getByText("Warnungen")).toBeInTheDocument();
  });

  it("shows 'Keine aktiven Warnungen' when no alerts", async () => {
    vi.doMock("../../hooks/useAlerts", () => ({
      useActiveAlerts: () => ({ data: { alerts: [] } }),
    }));
    renderBell();
    const bell = screen.getByRole("button", { name: /keine warnungen/i });
    fireEvent.click(bell);
    expect(screen.getByText("Keine aktiven Warnungen")).toBeInTheDocument();
  });

  it("closes dropdown on close button click", async () => {
    vi.doMock("../../hooks/useAlerts", () => ({
      useActiveAlerts: () => ({ data: mockAlerts }),
    }));
    renderBell();
    const bell = screen.getByRole("button", { name: /warnungen/i });
    fireEvent.click(bell);
    const closeBtn = screen.getByRole("button", { name: /schließen/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText("Warnungen")).not.toBeInTheDocument();
  });
});
