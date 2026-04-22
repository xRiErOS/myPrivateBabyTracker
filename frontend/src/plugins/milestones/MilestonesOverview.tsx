/** Milestones overview — Leap status, suggestions, recently completed. */

import { Check, CloudSun, CloudLightning, Star } from "lucide-react";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import {
  useCategories,
  useCreateMilestone,
  useLeapStatus,
  useMilestoneEntries,
  useSuggestions,
} from "../../hooks/useMilestones";
import type { LeapStatusItem, MilestoneCategory, MilestoneSuggestion } from "../../api/types";

/** Safely parse a JSON string into a string array. */
function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Find category by id, return name + color. */
function getCategoryInfo(categories: MilestoneCategory[], categoryId: number) {
  const cat = categories.find((c) => c.id === categoryId);
  return cat ? { name: cat.name, color: cat.color } : { name: "Allgemein", color: "#8087a2" };
}

/** Format ISO date string to German locale date. */
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LeapCard({ leap }: { leap: LeapStatusItem }) {
  const isStorm = leap.status === "active_storm";
  const borderColor = isStorm ? "border-peach" : "border-green";
  const badgeBg = isStorm ? "bg-peach" : "bg-green";
  const badgeLabel = isStorm ? "Sturmphase" : "Sonnenphase";
  const StatusIcon = isStorm ? CloudLightning : CloudSun;

  const skills = parseJsonArray(leap.new_skills);

  return (
    <Card className={`border-2 ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-headline text-text text-lg">
          Sprung {leap.leap_number} &mdash; {leap.title}
        </h3>
        <span
          className={`${badgeBg} text-ground font-label text-xs px-2 py-1 rounded-full inline-flex items-center gap-1`}
        >
          <StatusIcon size={14} />
          {badgeLabel}
        </span>
      </div>

      {leap.description && (
        <p className="font-body text-subtext0 text-sm mb-3">{leap.description}</p>
      )}

      {skills.length > 0 && (
        <div className="mb-3">
          <h4 className="font-label text-text text-sm mb-1">Neue Faehigkeiten</h4>
          <ul className="list-disc list-inside text-subtext0 text-sm space-y-0.5">
            {skills.map((skill, i) => (
              <li key={i} className="font-body">{skill}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="font-body text-overlay0 text-xs italic">
        Jedes Kind entwickelt sich in eigenem Tempo.
      </p>
    </Card>
  );
}

interface SuggestionCardProps {
  suggestion: MilestoneSuggestion;
  categoryInfo: { name: string; color: string };
  onComplete: (s: MilestoneSuggestion) => void;
  isLoading: boolean;
}

function SuggestionCard({ suggestion, categoryInfo, onComplete, isLoading }: SuggestionCardProps) {
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-body text-text text-sm truncate">{suggestion.title}</p>
        <span
          className="inline-block font-label text-xs mt-1 px-2 py-0.5 rounded-full"
          style={{ backgroundColor: categoryInfo.color + "33", color: categoryInfo.color }}
        >
          {categoryInfo.name}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onComplete(suggestion)}
        disabled={isLoading}
        className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-surface1 text-overlay0 hover:bg-green hover:text-ground transition-colors disabled:opacity-50"
        aria-label={`${suggestion.title} als erreicht markieren`}
      >
        <Check size={20} />
      </button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MilestonesOverview() {
  const { activeChild } = useActiveChild();
  const childId = activeChild?.id;

  const { data: leapStatus } = useLeapStatus(childId);
  const { data: suggestions } = useSuggestions(childId);
  const { data: categories } = useCategories(childId);
  const { data: recentEntries } = useMilestoneEntries({
    child_id: childId,
    completed: true,
  });

  const createMilestone = useCreateMilestone();

  const cats = categories ?? [];
  const activeLeap = leapStatus?.active_leap ?? null;

  // Filter: only uncompleted suggestions, max 5
  const pendingSuggestions = (suggestions ?? [])
    .filter((s) => !s.is_completed)
    .slice(0, 5);

  // Last 5 completed entries, sorted by completed_date desc
  const recentCompleted = (recentEntries ?? [])
    .filter((e) => e.completed && e.completed_date)
    .sort((a, b) => (b.completed_date! > a.completed_date! ? 1 : -1))
    .slice(0, 5);

  const handleQuickComplete = (s: MilestoneSuggestion) => {
    if (!childId) return;
    createMilestone.mutate({
      child_id: childId,
      template_id: s.id,
      title: s.title,
      category_id: s.category_id,
      source_type: s.source_type,
      completed: true,
      completed_date: new Date().toISOString().split("T")[0],
    });
  };

  if (!childId) return null;

  return (
    <div className="space-y-6">
      {/* 1. Active Leap */}
      {activeLeap && (
        <section>
          <LeapCard leap={activeLeap} />
        </section>
      )}

      {/* 2. Next milestones (suggestions) */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Star size={18} className="text-mauve" />
          <h2 className="font-headline text-text text-base">
            Naechste Meilensteine
          </h2>
          {pendingSuggestions.length > 0 && (
            <span className="font-label text-xs text-overlay0 bg-surface1 px-2 py-0.5 rounded-full">
              {pendingSuggestions.length}
            </span>
          )}
        </div>

        {pendingSuggestions.length === 0 ? (
          <Card>
            <p className="font-body text-subtext0 text-sm text-center py-2">
              Alle Meilensteine fuer dieses Alter erreicht!
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pendingSuggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                categoryInfo={getCategoryInfo(cats, s.category_id)}
                onComplete={handleQuickComplete}
                isLoading={createMilestone.isPending}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. Recently completed */}
      {recentCompleted.length > 0 && (
        <section>
          <h2 className="font-headline text-text text-base mb-3">Zuletzt erreicht</h2>
          <div className="space-y-2">
            {recentCompleted.map((entry) => {
              const catInfo = getCategoryInfo(cats, entry.category_id);
              return (
                <Card key={entry.id} className="flex items-center gap-3">
                  <Check size={16} className="text-green flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-text text-sm truncate">{entry.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-block font-label text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: catInfo.color + "33",
                          color: catInfo.color,
                        }}
                      >
                        {catInfo.name}
                      </span>
                      <span className="font-body text-overlay0 text-xs">
                        {formatDate(entry.completed_date!)}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
