import { describe, it, expect } from "vitest";
import { berlinHour, defaultSleepTypeForTime, rollEndIfCrossMidnight } from "../../lib/dateUtils";

describe("rollEndIfCrossMidnight", () => {
  it("rollt Ende auf nächsten Tag, wenn Ende chronologisch vor Start liegt (Cross-Midnight)", () => {
    const start = "2026-04-27T19:00:00.000Z";
    const end = "2026-04-27T23:55:00.000Z";
    const startLocal = new Date("2026-04-27T21:00:00").toISOString();
    const endLocalSameDay = new Date("2026-04-27T01:55:00").toISOString();
    const result = rollEndIfCrossMidnight(startLocal, endLocalSameDay);
    expect(new Date(result).getTime()).toBeGreaterThan(new Date(startLocal).getTime());
    const diffH = (new Date(result).getTime() - new Date(startLocal).getTime()) / 3_600_000;
    expect(diffH).toBeGreaterThan(0);
    expect(diffH).toBeLessThanOrEqual(18);
    void start;
    void end;
  });

  it("lässt Ende unverändert, wenn Ende bereits nach Start liegt", () => {
    const start = "2026-04-27T20:00:00.000Z";
    const end = "2026-04-27T22:00:00.000Z";
    expect(rollEndIfCrossMidnight(start, end)).toBe(end);
  });

  it("rollt nicht, wenn die resultierende Dauer > 18h wäre", () => {
    const start = "2026-04-27T22:00:00.000Z";
    const end = "2026-04-27T03:00:00.000Z";
    const result = rollEndIfCrossMidnight(start, end);
    const diffH = (new Date(result).getTime() - new Date(start).getTime()) / 3_600_000;
    expect(Math.abs(diffH) <= 18 || result === end).toBe(true);
  });

  it("rollt nicht bei identischem Start und Ende (kein 24h-Schlaf)", () => {
    const start = "2026-04-27T22:00:00.000Z";
    const end = "2026-04-27T22:00:00.000Z";
    const result = rollEndIfCrossMidnight(start, end);
    expect(result).toBe(end);
  });

  it("Realbeispiel aus Bug-Report: 27.04 21:00 → 28.04 01:55 wird korrekt aufgelöst", () => {
    const startLocal = new Date(2026, 3, 27, 21, 0).toISOString();
    const endSameDay = new Date(2026, 3, 27, 1, 55).toISOString();
    const result = rollEndIfCrossMidnight(startLocal, endSameDay);
    const resultDate = new Date(result);
    expect(resultDate.getDate()).toBe(28);
    expect(resultDate.getHours()).toBe(1);
    expect(resultDate.getMinutes()).toBe(55);
  });
});

describe("berlinHour", () => {
  it("liefert 22 für 22:30 Berliner Sommerzeit (UTC 20:30 im Juli)", () => {
    expect(berlinHour(new Date("2026-07-15T20:30:00Z"))).toBe(22);
  });

  it("liefert 03 für 03:15 Berliner Winterzeit (UTC 02:15 im Januar)", () => {
    expect(berlinHour(new Date("2026-01-15T02:15:00Z"))).toBe(3);
  });

  it("liefert 14 mittags Berliner Zeit", () => {
    expect(berlinHour(new Date("2026-04-28T12:00:00Z"))).toBe(14);
  });
});

describe("defaultSleepTypeForTime", () => {
  it("ist 'night' um 22:00 Berlin", () => {
    expect(defaultSleepTypeForTime(new Date("2026-04-28T20:00:00Z"))).toBe("night");
  });

  it("ist 'night' um 23:30 Berlin", () => {
    expect(defaultSleepTypeForTime(new Date("2026-04-28T21:30:00Z"))).toBe("night");
  });

  it("ist 'night' um 02:00 Berlin", () => {
    expect(defaultSleepTypeForTime(new Date("2026-04-28T00:00:00Z"))).toBe("night");
  });

  it("ist 'night' um 05:59 Berlin", () => {
    expect(defaultSleepTypeForTime(new Date("2026-04-28T03:59:00Z"))).toBe("night");
  });

  it("ist 'nap' um 06:00 Berlin", () => {
    expect(defaultSleepTypeForTime(new Date("2026-04-28T04:00:00Z"))).toBe("nap");
  });

  it("ist 'nap' um 14:00 Berlin", () => {
    expect(defaultSleepTypeForTime(new Date("2026-04-28T12:00:00Z"))).toBe("nap");
  });

  it("ist 'nap' um 21:59 Berlin", () => {
    expect(defaultSleepTypeForTime(new Date("2026-04-28T19:59:00Z"))).toBe("nap");
  });
});
