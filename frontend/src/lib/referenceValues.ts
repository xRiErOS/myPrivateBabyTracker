/** Age-based reference values for alert thresholds.
 *
 * Each rule maps to an array of age ranges with recommended values.
 * `maxAgeDays` is inclusive upper bound. Use `Infinity` for open-ended.
 */

export interface ReferenceRange {
  label: string;
  maxAgeDays: number;
  /** Lower bound of recommended range */
  recommended: number;
  /** Upper bound of recommended range (if different from recommended) */
  recommendedMax?: number;
  /** Display string for the table (e.g. "6-8") */
  display: string;
}

export type RuleKey = "wet_diaper_min" | "feeding_interval_hours" | "fever_threshold" | "no_stool_hours" | "low_feeding_ml";

/** Nasse Windeln pro Tag — Minimum */
const WET_DIAPER_REFERENCES: ReferenceRange[] = [
  { label: "0-1 Tag", maxAgeDays: 1, recommended: 1, recommendedMax: 2, display: "1-2" },
  { label: "1-3 Tage", maxAgeDays: 3, recommended: 3, recommendedMax: 4, display: "3-4" },
  { label: "4-7 Tage", maxAgeDays: 7, recommended: 4, recommendedMax: 6, display: "4-6" },
  { label: "1-4 Wochen", maxAgeDays: 28, recommended: 6, recommendedMax: 8, display: "6-8" },
  { label: "1-6 Monate", maxAgeDays: 180, recommended: 6, recommendedMax: 8, display: "6-8" },
  { label: "6-12 Monate", maxAgeDays: 365, recommended: 4, recommendedMax: 6, display: "4-6" },
];

/** Fuetterungsintervall in Stunden — Maximum */
const FEEDING_INTERVAL_REFERENCES: ReferenceRange[] = [
  { label: "0-4 Wochen", maxAgeDays: 28, recommended: 2, recommendedMax: 3, display: "2-3 h" },
  { label: "1-3 Monate", maxAgeDays: 90, recommended: 2.5, recommendedMax: 3.5, display: "2.5-3.5 h" },
  { label: "3-6 Monate", maxAgeDays: 180, recommended: 3, recommendedMax: 4, display: "3-4 h" },
  { label: "6-12 Monate", maxAgeDays: 365, recommended: 4, recommendedMax: 5, display: "4-5 h" },
];

/** Temperatur-Schwellwerte */
const FEVER_REFERENCES: ReferenceRange[] = [
  { label: "Alle Alter", maxAgeDays: Infinity, recommended: 38.5, display: ">= 38.5 Fieber" },
];

/** Kein Stuhlgang — Stunden (generische Empfehlung) */
const NO_STOOL_REFERENCES: ReferenceRange[] = [
  { label: "0-6 Wochen", maxAgeDays: 42, recommended: 24, display: "24 h" },
  { label: "6 Wochen - 6 Monate", maxAgeDays: 180, recommended: 72, display: "72 h" },
  { label: "6-12 Monate", maxAgeDays: 365, recommended: 48, display: "48 h" },
];

/** Trinkmenge ml/Tag (Flasche) */
const LOW_FEEDING_REFERENCES: ReferenceRange[] = [
  { label: "0-2 Wochen", maxAgeDays: 14, recommended: 300, recommendedMax: 500, display: "300-500 ml" },
  { label: "2-8 Wochen", maxAgeDays: 56, recommended: 500, recommendedMax: 700, display: "500-700 ml" },
  { label: "2-4 Monate", maxAgeDays: 120, recommended: 700, recommendedMax: 900, display: "700-900 ml" },
  { label: "4-6 Monate", maxAgeDays: 180, recommended: 800, recommendedMax: 1000, display: "800-1000 ml" },
  { label: "6-12 Monate", maxAgeDays: 365, recommended: 500, recommendedMax: 700, display: "500-700 ml" },
];

export const REFERENCE_VALUES: Record<RuleKey, ReferenceRange[]> = {
  wet_diaper_min: WET_DIAPER_REFERENCES,
  feeding_interval_hours: FEEDING_INTERVAL_REFERENCES,
  fever_threshold: FEVER_REFERENCES,
  no_stool_hours: NO_STOOL_REFERENCES,
  low_feeding_ml: LOW_FEEDING_REFERENCES,
};

/** Get the age of a child in days from birth_date string (ISO). */
export function getChildAgeDays(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
}

/** Find the matching reference range for a given age in days. */
export function getRecommendedValue(
  ruleKey: RuleKey,
  ageDays: number
): ReferenceRange | null {
  const ranges = REFERENCE_VALUES[ruleKey];
  if (!ranges) return null;
  return ranges.find((r) => ageDays <= r.maxAgeDays) ?? ranges[ranges.length - 1];
}
