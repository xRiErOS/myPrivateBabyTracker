/**
 * Category-specific Lucide icon mapping for milestone placeholders.
 * Used in MilestonesTimeline, MilestonesOverview, and MilestonesList.
 */

import {
  Baby,
  Camera,
  Footprints,
  Hand,
  Heart,
  Lightbulb,
  MessageCircle,
  Shield,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Maps category names (as stored in DB) to a Lucide icon component. */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Grobmotorik: Footprints,
  Feinmotorik: Hand,
  Sprache: MessageCircle,
  Kognition: Lightbulb,
  Soziales: Heart,
  Gesundheit: Shield,
  Familienerinnerungen: Camera,
  Spruenge: Zap,
};

/** Returns the Lucide icon component for a given category name.
 *  Falls back to Star if the category is unknown or undefined.
 */
export function getCategoryIcon(categoryName: string | undefined): LucideIcon {
  if (!categoryName) return Baby;
  return CATEGORY_ICON_MAP[categoryName] ?? Star;
}
