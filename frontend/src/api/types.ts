/** TypeScript interfaces matching backend Pydantic schemas. */

export interface Child {
  id: number;
  name: string;
  birth_date: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ChildCreate {
  name: string;
  birth_date: string;
  notes?: string | null;
}

export interface ChildUpdate {
  name?: string;
  birth_date?: string;
  notes?: string | null;
  is_active?: boolean;
}

export type FeedingType = "breast_left" | "breast_right" | "bottle" | "solid";

export interface FeedingEntry {
  id: number;
  child_id: number;
  start_time: string;
  end_time: string | null;
  feeding_type: FeedingType;
  amount_ml: number | null;
  food_type: string | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface FeedingCreate {
  child_id: number;
  start_time: string;
  end_time?: string | null;
  feeding_type: FeedingType;
  amount_ml?: number | null;
  food_type?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
}

export type DiaperType = "wet" | "dirty" | "mixed" | "dry";

export interface DiaperEntry {
  id: number;
  child_id: number;
  time: string;
  diaper_type: DiaperType;
  color: string | null;
  consistency: string | null;
  has_rash: boolean;
  notes: string | null;
  created_at: string;
}

export interface DiaperCreate {
  child_id: number;
  time: string;
  diaper_type: DiaperType;
  color?: string | null;
  consistency?: string | null;
  has_rash?: boolean;
  notes?: string | null;
}

export type SleepType = "nap" | "night";

export interface SleepEntry {
  id: number;
  child_id: number;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  sleep_type: SleepType;
  location: string | null;
  quality: number | null;
  notes: string | null;
  created_at: string;
}

export interface SleepCreate {
  child_id: number;
  start_time: string;
  end_time?: string | null;
  sleep_type: SleepType;
  location?: string | null;
  quality?: number | null;
  notes?: string | null;
}

export interface SleepUpdate {
  start_time?: string | null;
  end_time?: string | null;
  sleep_type?: SleepType | null;
  location?: string | null;
  quality?: number | null;
  notes?: string | null;
}

export interface FeedingUpdate {
  start_time?: string | null;
  end_time?: string | null;
  feeding_type?: FeedingType | null;
  amount_ml?: number | null;
  food_type?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
}

export interface DiaperUpdate {
  time?: string | null;
  diaper_type?: DiaperType | null;
  color?: string | null;
  consistency?: string | null;
  has_rash?: boolean | null;
  notes?: string | null;
}

export interface HealthStatus {
  status: string;
  version: string;
  database: string;
  plugins_loaded: number;
}
