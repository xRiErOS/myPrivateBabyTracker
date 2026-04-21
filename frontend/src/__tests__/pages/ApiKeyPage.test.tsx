/** Tests for ApiKeyPage — renders page and displays keys. */

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ApiKeyPage from "../../pages/ApiKeyPage";

// Mock ToastContext
vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

// Mock useApiKeys hook
vi.mock("../../hooks/useApiKeys", () => ({
  useApiKeys: () => ({
    data: [
      {
        id: 1,
        name: "Home Assistant",
        key_prefix: "mbk_abcd1234",
        scopes: ["read", "write"],
        is_active: true,
        last_used_at: null,
        created_at: "2026-04-21T00:00:00Z",
      },
    ],
    isLoading: false,
  }),
  useCreateApiKey: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateApiKey: () => ({ mutate: vi.fn() }),
  useDeleteApiKey: () => ({ mutate: vi.fn() }),
}));

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ApiKeyPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ApiKeyPage", () => {
  it("renders page heading", () => {
    renderPage();
    expect(screen.getByText("API-Keys")).toBeInTheDocument();
  });

  it("renders key list with key name", () => {
    renderPage();
    expect(screen.getByText("Home Assistant")).toBeInTheDocument();
  });

  it("renders key prefix", () => {
    renderPage();
    expect(screen.getByText("mbk_abcd1234...")).toBeInTheDocument();
  });

  it("renders scope badges", () => {
    renderPage();
    expect(screen.getByText("read")).toBeInTheDocument();
    expect(screen.getByText("write")).toBeInTheDocument();
  });

  it("renders create button", () => {
    renderPage();
    expect(screen.getByText("Neuen Key erstellen")).toBeInTheDocument();
  });

  it("renders active toggle", () => {
    renderPage();
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});
