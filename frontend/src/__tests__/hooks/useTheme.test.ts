import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "../../hooks/useTheme";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// jsdom does not implement matchMedia by default — provide a controllable stub.
const matchMediaState = { matches: false };
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: matchMediaState.matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("useTheme", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    matchMediaState.matches = false;
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("dark");
  });

  it("defaults to system mode when no stored preference", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe("system");
    // System has no dark preference in this test → effective theme is light.
    expect(result.current.theme).toBe("light");
  });

  it("resolves system mode to dark when prefers-color-scheme is dark", () => {
    matchMediaState.matches = true;
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe("system");
    expect(result.current.theme).toBe("dark");
  });

  it("persists explicit mode to localStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setMode("dark");
    });
    expect(localStorage.getItem("mybaby-theme")).toBe("dark");
    expect(result.current.theme).toBe("dark");
  });

  it("toggle switches between light and dark", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggle();
    });
    // From "system" the toggle goes via the "prev === dark ? light : dark"
    // rule, so a single toggle ends up at dark.
    expect(result.current.mode).toBe("dark");
    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.toggle();
    });
    expect(result.current.mode).toBe("light");
    expect(result.current.theme).toBe("light");
  });

  it("sets data-theme attribute on document", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setMode("dark");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("adds dark class to document for Tailwind", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setMode("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("restores explicit dark mode from localStorage", () => {
    localStorage.setItem("mybaby-theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe("dark");
    expect(result.current.theme).toBe("dark");
  });

  it("restores system mode from localStorage", () => {
    localStorage.setItem("mybaby-theme", "system");
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe("system");
  });
});
