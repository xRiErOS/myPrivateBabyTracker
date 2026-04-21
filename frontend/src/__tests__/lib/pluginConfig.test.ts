import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getEnabledPlugins,
  setEnabledPlugins,
  isPluginEnabled,
  togglePlugin,
} from "../../lib/pluginConfig";
import { OPTIONAL_PLUGINS } from "../../lib/pluginRegistry";

const ALL_OPTIONAL_KEYS = OPTIONAL_PLUGINS.map((p) => p.key);

let store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { store = {}; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};

Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  store = {};
  vi.clearAllMocks();
});

describe("getEnabledPlugins", () => {
  it("returns all optional plugins when no config exists", () => {
    expect(getEnabledPlugins()).toEqual(ALL_OPTIONAL_KEYS);
  });

  it("returns stored plugins from localStorage", () => {
    store["mybaby_enabled_plugins"] = JSON.stringify(["temperature", "weight"]);
    expect(getEnabledPlugins()).toEqual(["temperature", "weight"]);
  });

  it("filters out invalid keys", () => {
    store["mybaby_enabled_plugins"] = JSON.stringify(["temperature", "nonexistent"]);
    expect(getEnabledPlugins()).toEqual(["temperature"]);
  });

  it("returns default for corrupt JSON", () => {
    store["mybaby_enabled_plugins"] = "not-json";
    expect(getEnabledPlugins()).toEqual(ALL_OPTIONAL_KEYS);
  });

  it("returns default for non-array JSON", () => {
    store["mybaby_enabled_plugins"] = JSON.stringify({ foo: "bar" });
    expect(getEnabledPlugins()).toEqual(ALL_OPTIONAL_KEYS);
  });
});

describe("setEnabledPlugins", () => {
  it("persists keys to localStorage", () => {
    setEnabledPlugins(["temperature"]);
    expect(JSON.parse(store["mybaby_enabled_plugins"])).toEqual(["temperature"]);
  });

  it("dispatches storage event", () => {
    const spy = vi.fn();
    window.addEventListener("storage", spy);
    setEnabledPlugins(["temperature"]);
    window.removeEventListener("storage", spy);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("isPluginEnabled", () => {
  it("returns true for base plugins regardless of config", () => {
    setEnabledPlugins([]); // no optional plugins enabled
    expect(isPluginEnabled("sleep")).toBe(true);
    expect(isPluginEnabled("feeding")).toBe(true);
    expect(isPluginEnabled("diaper")).toBe(true);
  });

  it("returns true for enabled optional plugins", () => {
    setEnabledPlugins(["temperature"]);
    expect(isPluginEnabled("temperature")).toBe(true);
  });

  it("returns false for disabled optional plugins", () => {
    setEnabledPlugins(["temperature"]);
    expect(isPluginEnabled("weight")).toBe(false);
  });

  it("returns false for unknown plugin keys", () => {
    expect(isPluginEnabled("nonexistent")).toBe(false);
  });

  it("returns true for all optional plugins by default", () => {
    for (const key of ALL_OPTIONAL_KEYS) {
      expect(isPluginEnabled(key)).toBe(true);
    }
  });
});

describe("togglePlugin", () => {
  it("disables an enabled optional plugin", () => {
    // Default: all enabled
    togglePlugin("temperature");
    expect(isPluginEnabled("temperature")).toBe(false);
  });

  it("enables a disabled optional plugin", () => {
    setEnabledPlugins([]);
    togglePlugin("weight");
    expect(isPluginEnabled("weight")).toBe(true);
  });

  it("has no effect on base plugins", () => {
    togglePlugin("sleep");
    expect(isPluginEnabled("sleep")).toBe(true);
  });

  it("has no effect on unknown plugin keys", () => {
    togglePlugin("nonexistent");
    // No localStorage writes for unknown keys
    expect(store["mybaby_enabled_plugins"]).toBeUndefined();
  });
});
