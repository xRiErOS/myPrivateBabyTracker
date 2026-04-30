/** Tests for ProfilePage — locale switch (Backlog #183). */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import i18n from "../../i18n";
import ProfilePage from "../../pages/ProfilePage";

const getPreferencesMock = vi.fn();
const updatePreferencesMock = vi.fn();

vi.mock("../../api/preferences", () => ({
  getPreferences: () => getPreferencesMock(),
  updatePreferences: (patch: unknown) => updatePreferencesMock(patch),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: "erik",
      display_name: "Erik",
      role: "admin",
      auth_type: "local",
    },
  }),
}));

// jsdom in this project does not expose a writable localStorage; stub it.
const memoryStorage = (() => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => { map.clear(); },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() { return map.size; },
  };
})();
Object.defineProperty(window, "localStorage", {
  value: memoryStorage,
  configurable: true,
});

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProfilePage — locale switch", () => {
  beforeEach(async () => {
    getPreferencesMock.mockReset();
    updatePreferencesMock.mockReset();
    getPreferencesMock.mockResolvedValue({
      quick_actions: ["sleep", "feeding", "diaper"],
      widget_order: null,
      track_visibility: null,
      timezone: "Europe/Berlin",
      locale: "de",
    });
    await i18n.changeLanguage("de");
  });

  afterEach(async () => {
    await i18n.changeLanguage("de");
  });

  it("renders language dropdown with current locale", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Sprache")).toBeInTheDocument();
    });
    const selects = screen.getAllByRole("combobox");
    const langSelect = selects.find(
      (el) => (el as HTMLSelectElement).value === "de",
    ) as HTMLSelectElement;
    expect(langSelect).toBeDefined();
  });

  it("calls updatePreferences with locale=en when switching to English", async () => {
    updatePreferencesMock.mockResolvedValue({
      quick_actions: ["sleep", "feeding", "diaper"],
      widget_order: null,
      track_visibility: null,
      timezone: "Europe/Berlin",
      locale: "en",
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Sprache")).toBeInTheDocument();
    });

    const selects = screen.getAllByRole("combobox");
    const langSelect = selects.find(
      (el) => (el as HTMLSelectElement).value === "de",
    ) as HTMLSelectElement;

    fireEvent.change(langSelect, { target: { value: "en" } });

    await waitFor(() => {
      expect(updatePreferencesMock).toHaveBeenCalledWith({ locale: "en" });
    });

    await waitFor(() => {
      expect(screen.getByText("Gespeichert")).toBeInTheDocument();
    });
  });

  it("shows save_failed when backend rejects the locale change", async () => {
    updatePreferencesMock.mockRejectedValue(new Error("API 422: invalid"));

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Sprache")).toBeInTheDocument();
    });

    const selects = screen.getAllByRole("combobox");
    const langSelect = selects.find(
      (el) => (el as HTMLSelectElement).value === "de",
    ) as HTMLSelectElement;

    fireEvent.change(langSelect, { target: { value: "en" } });

    await waitFor(() => {
      expect(updatePreferencesMock).toHaveBeenCalledWith({ locale: "en" });
    });

    await waitFor(() => {
      expect(screen.getByText("Speichern fehlgeschlagen")).toBeInTheDocument();
    });
  });
});
