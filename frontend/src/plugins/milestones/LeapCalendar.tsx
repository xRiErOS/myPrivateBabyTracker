/** LeapCalendar — Vertical list of 10 Wonder Weeks leaps with status-based styling. */

import { useState } from "react";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import { useLeapStatus } from "../../hooks/useMilestones";
import type { LeapStatus, LeapStatusItem } from "../../api/types";

function parseJson(val: string | null): string[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

function statusLabel(status: LeapStatus): string {
  switch (status) {
    case "active_storm":
      return "Stressphase";
    case "active_sun":
      return "Sonnenschein";
    case "past":
      return "Vergangen";
    case "upcoming":
      return "Bevorstehend";
    case "far_future":
      return "Noch weit weg";
  }
}

function StatusBadge({ status }: { status: LeapStatus }) {
  const base = "text-xs font-label px-2 py-0.5 rounded-full";
  switch (status) {
    case "active_storm":
      return <span className={`${base} bg-red/15 text-red`}>{statusLabel(status)}</span>;
    case "active_sun":
      return <span className={`${base} bg-green/15 text-green`}>{statusLabel(status)}</span>;
    case "upcoming":
      return <span className={`${base} bg-blue/10 text-blue`}>{statusLabel(status)}</span>;
    case "past":
      return <span className={`${base} bg-surface1 text-overlay0`}>{statusLabel(status)}</span>;
    case "far_future":
      return <span className={`${base} bg-surface1 text-overlay0`}>{statusLabel(status)}</span>;
  }
}

function isExpandedByDefault(status: LeapStatus): boolean {
  return status === "active_storm" || status === "active_sun";
}

function useChecklist(leapId: number, key: string): [Set<number>, (idx: number) => void] {
  const storageKey = `leap_checks_${leapId}_${key}`;
  const [checked, setChecked] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  function toggle(idx: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }

  return [checked, toggle];
}

function LeapCard({ leap }: { leap: LeapStatusItem }) {
  const [expanded, setExpanded] = useState(isExpandedByDefault(leap.status));
  const skills = parseJson(leap.new_skills);
  const signs = parseJson(leap.storm_signs);
  const isActive = leap.status === "active_storm" || leap.status === "active_sun";
  const isPast = leap.status === "past";
  const isFarFuture = leap.status === "far_future";
  const isDimmed = isPast || isFarFuture;
  const isUpcoming = leap.status === "upcoming" || leap.status === "far_future";

  const [checkedSkills, toggleSkill] = useChecklist(leap.id, "skills");
  const [checkedSigns, toggleSign] = useChecklist(leap.id, "signs");

  const borderClass = isActive
    ? leap.status === "active_storm"
      ? "border-l-4 border-peach bg-red/5"
      : "border-l-4 border-green bg-green/5"
    : "";

  const countdown = isUpcoming ? daysUntil(leap.storm_start_date) : null;

  return (
    <Card
      className={`${borderClass} ${isDimmed ? "opacity-70" : ""} cursor-pointer`}
      onClick={() => setExpanded((p) => !p)}
    >
      <div className="min-h-[44px] flex flex-col gap-1">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-headline text-sm text-text">
            Sprung {leap.leap_number} &mdash; {leap.title}
          </h3>
          <StatusBadge status={leap.status} />
        </div>

        {/* Time range */}
        <p className="font-label text-xs text-subtext0">
          Woche {leap.storm_start_weeks} - {leap.sun_start_weeks}
          {leap.storm_start_date && leap.sun_start_date && (
            <span className="ml-1 text-overlay1">
              ({formatDate(leap.storm_start_date)} - {formatDate(leap.sun_start_date)})
            </span>
          )}
        </p>

        {/* Countdown + storm start date for upcoming/far_future */}
        {isUpcoming && leap.storm_start_date && (
          <div className="flex flex-col gap-0.5">
            <p className="font-body text-xs text-subtext1">
              Sturmphase ab {formatDate(leap.storm_start_date)}
            </p>
            {countdown !== null && (
              <p className="font-body text-xs text-sapphire font-medium">
                Beginnt in {countdown} Tagen
              </p>
            )}
          </div>
        )}

        {/* Expandable details */}
        {expanded && (
          <div className="mt-2 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            {/* Description */}
            {leap.description && (
              <p className="font-body text-sm text-subtext0">{leap.description}</p>
            )}

            {/* New skills — checkboxes */}
            {skills.length > 0 && (
              <div>
                <h4 className="font-label text-xs text-subtext1 mb-1">Neue Faehigkeiten</h4>
                <div className="flex flex-col gap-0.5">
                  {skills.map((skill, i) => (
                    <label key={i} className="flex items-center gap-2 min-h-[36px]">
                      <input
                        type="checkbox"
                        checked={checkedSkills.has(i)}
                        onChange={() => toggleSkill(i)}
                        className="accent-peach"
                      />
                      <span
                        className={`font-body text-sm ${
                          checkedSkills.has(i)
                            ? "text-overlay0 line-through"
                            : "text-text"
                        }`}
                      >
                        {skill}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Storm signs — checkboxes */}
            {signs.length > 0 && (
              <div>
                <h4 className="font-label text-xs text-subtext1 mb-1">Sturm-Anzeichen</h4>
                <div className="flex flex-col gap-0.5">
                  {signs.map((sign, i) => (
                    <label key={i} className="flex items-center gap-2 min-h-[36px]">
                      <input
                        type="checkbox"
                        checked={checkedSigns.has(i)}
                        onChange={() => toggleSign(i)}
                        className="accent-peach"
                      />
                      <span
                        className={`font-body text-sm ${
                          checkedSigns.has(i)
                            ? "text-overlay0 line-through"
                            : "text-text"
                        }`}
                      >
                        {sign}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export function LeapCalendar() {
  const { activeChild } = useActiveChild();
  const { data, isLoading, error } = useLeapStatus(activeChild?.id);

  if (isLoading) {
    return <p className="text-center text-subtext0 py-8">Lade Spruenge...</p>;
  }

  if (error) {
    return <p className="text-center text-red py-8">Fehler beim Laden der Spruenge.</p>;
  }

  if (!data || data.leaps.length === 0) {
    return <p className="text-center text-subtext0 py-8">Keine Sprungdaten verfuegbar.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Age context */}
      <p className="font-label text-xs text-subtext1 text-center">
        Alter: {data.child_age_weeks} Wochen
      </p>

      {/* Leap cards */}
      {data.leaps.map((leap) => (
        <LeapCard key={leap.id} leap={leap} />
      ))}

      {/* Disclaimer */}
      <p className="font-body text-xs text-overlay0 text-center px-4 py-2">
        Entwicklungsspruenge sind wissenschaftlich umstritten. Viele Eltern erleben die
        Muster dennoch als hilfreiche Orientierung.
      </p>
    </div>
  );
}
