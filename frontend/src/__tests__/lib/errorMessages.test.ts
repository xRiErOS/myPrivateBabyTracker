import { describe, it, expect } from "vitest";
import { formatApiError } from "../../lib/errorMessages";
import { ApiError } from "../../api/client";

function pydanticError(status: number, msg: string): ApiError {
  const body = JSON.stringify({
    detail: [{ type: "value_error", loc: ["body"], msg, input: {}, ctx: { error: {} } }],
  });
  return new ApiError(status, `API ${status}: ${body}`);
}

function detailError(status: number, detail: string): ApiError {
  return new ApiError(status, `API ${status}: ${JSON.stringify({ detail })}`);
}

describe("formatApiError", () => {
  it("extrahiert Pydantic-422-msg ohne 'Value error,'-Prefix", () => {
    const err = pydanticError(422, "Value error, end_time must be after start_time");
    expect(formatApiError(err)).toBe("end_time must be after start_time");
  });

  it("nimmt String-detail unverändert", () => {
    const err = detailError(404, "Eintrag nicht gefunden");
    expect(formatApiError(err)).toBe("Eintrag nicht gefunden");
  });

  it("Fallback-Meldung pro Status, wenn kein Body parsebar", () => {
    const err = new ApiError(500, "API 500: ");
    expect(formatApiError(err)).toBe("Server-Fehler — bitte später erneut versuchen.");
  });

  it("Fallback bei 401", () => {
    const err = new ApiError(401, "API 401: ");
    expect(formatApiError(err)).toBe("Anmeldung abgelaufen — bitte neu anmelden.");
  });

  it("Fallback für unbekannten Status mit Code", () => {
    const err = new ApiError(418, "API 418: ");
    expect(formatApiError(err)).toBe("Fehler 418");
  });

  it("entfernt 'Assertion failed,'-Prefix", () => {
    const err = pydanticError(422, "Assertion failed, value must be positive");
    expect(formatApiError(err)).toBe("value must be positive");
  });

  it("ersetzt ISO-Timestamps durch lokalisierte Anzeige", () => {
    const err = detailError(409, "Überlappung mit Eintrag 2026-04-27T19:00:00Z");
    const msg = formatApiError(err);
    expect(msg).not.toContain("2026-04-27T19:00:00Z");
    expect(msg).toContain("Überlappung mit Eintrag");
  });

  it("normaler Error gibt seine Nachricht zurück", () => {
    expect(formatApiError(new Error("Netzwerk weg"))).toBe("Netzwerk weg");
  });

  it("nicht-Error mit Fallback", () => {
    expect(formatApiError("string-error", "default")).toBe("default");
  });

  it("nicht-Error ohne Fallback", () => {
    expect(formatApiError(null)).toBe("Unbekannter Fehler.");
  });
});
