/** Regression tests for HabitWidget — weekday filter (Backlog #187, #177). */

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Habit } from "../../api/types";
import { HabitWidget } from "../../plugins/todo/HabitWidget";

vi.mock("../../context/ChildContext", () => ({
  useActiveChild: () => ({
    activeChild: { id: 1, name: "Test Baby" },
    children: [],
    setActiveChild: vi.fn(),
    isLoading: false,
  }),
}));

let mockHabits: Habit[] = [];
vi.mock("../../hooks/useTodos", () => ({
  useHabits: () => ({ data: mockHabits, isLoading: false }),
}));

function makeHabit(partial: Partial<Habit> & { id: number }): Habit {
  return {
    child_id: 1,
    title: `Habit ${partial.id}`,
    details: null,
    recurrence: "daily",
    weekdays: null,
    is_active: true,
    streak: 0,
    completed_today: false,
    created_at: "2026-04-20T10:00:00Z",
    ...partial,
  };
}

function renderWidget() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HabitWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("HabitWidget weekday filter", () => {
  beforeEach(() => {
    mockHabits = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("excludes Sunday-only habits on a Tuesday", () => {
    // Tuesday 2026-04-28
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T10:00:00"));

    mockHabits = [
      makeHabit({ id: 1, recurrence: "daily" }),
      makeHabit({ id: 2, recurrence: "weekly", weekdays: [6] }), // Sun only
    ];

    renderWidget();

    // Only the daily habit counts → "0/1"
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });

  it("includes Sunday-only habits on a Sunday", () => {
    // Sunday 2026-04-26
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T10:00:00"));

    mockHabits = [
      makeHabit({ id: 1, recurrence: "daily" }),
      makeHabit({ id: 2, recurrence: "weekly", weekdays: [6], completed_today: true }),
    ];

    renderWidget();

    // Both habits count, one done → "1/2"
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("counts daily habits regardless of weekday", () => {
    // Wednesday 2026-04-29
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T10:00:00"));

    mockHabits = [
      makeHabit({ id: 1, recurrence: "daily", completed_today: true }),
      makeHabit({ id: 2, recurrence: "daily" }),
    ];

    renderWidget();

    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("respects multi-weekday habits (Mon/Wed/Fri on Wednesday)", () => {
    // Wednesday 2026-04-29
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T10:00:00"));

    mockHabits = [
      makeHabit({ id: 1, recurrence: "weekly", weekdays: [0, 2, 4] }), // Mo/Mi/Fr
      makeHabit({ id: 2, recurrence: "weekly", weekdays: [1, 3] }), // Di/Do
    ];

    renderWidget();

    // Only Mo/Mi/Fr habit applies on Wednesday
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });

  it("renders 'Noch keine Habits' when only off-day weekly habits exist", () => {
    // Tuesday 2026-04-28
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T10:00:00"));

    mockHabits = [
      makeHabit({ id: 1, recurrence: "weekly", weekdays: [6] }), // Sun only
    ];

    renderWidget();

    expect(screen.getByText(/Noch keine Habits/)).toBeInTheDocument();
  });

  it("renders 'Alles erledigt!' when all today's habits are done", () => {
    // Saturday 2026-04-25
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T10:00:00"));

    mockHabits = [
      makeHabit({ id: 1, recurrence: "daily", completed_today: true }),
      makeHabit({ id: 2, recurrence: "weekly", weekdays: [6] }), // Sun only — not today
    ];

    renderWidget();

    expect(screen.getByText("Alles erledigt!")).toBeInTheDocument();
  });
});
