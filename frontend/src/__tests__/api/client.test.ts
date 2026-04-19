import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "../../api/client";

describe("apiFetch", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prepends /api to path", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "test" }),
    });

    await apiFetch("/v1/children");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/children",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("returns parsed JSON on success", async () => {
    const data = [{ id: 1, name: "Anna" }];
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    });

    const result = await apiFetch("/v1/children");
    expect(result).toEqual(data);
  });

  it("returns null for 204 No Content", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
    });

    const result = await apiFetch("/v1/children/1", { method: "DELETE" });
    expect(result).toBeNull();
  });

  it("throws ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not Found"),
    });

    await expect(apiFetch("/v1/children/999")).rejects.toThrow(ApiError);
    await expect(apiFetch("/v1/children/999")).rejects.toThrow("API 404");
  });

  it("includes CSRF token from cookie when available", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "csrftoken=abc123; other=value",
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/v1/children");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/children",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-CSRF-Token": "abc123",
        }),
      }),
    );

    // Reset cookie
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });
  });

  it("uses same-origin credentials", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/v1/test");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/test",
      expect.objectContaining({
        credentials: "same-origin",
      }),
    );
  });
});
