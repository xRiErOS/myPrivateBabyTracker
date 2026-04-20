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
  has_rash: boolean;
  notes: string | null;
  created_at: string;
}

export interface DiaperCreate {
  child_id: number;
  time: string;
  diaper_type: DiaperType;
  color?: string | null;
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
  has_rash?: boolean | null;
  notes?: string | null;
}

export interface VitaminD3Entry {
  id: number;
  child_id: number;
  date: string;
  given_at: string;
  created_at: string;
}

export interface VitaminD3Create {
  child_id: number;
  date: string;
}

export interface TemperatureEntry {
  id: number;
  child_id: number;
  measured_at: string;
  temperature_celsius: number;
  notes: string | null;
  created_at: string;
}

export interface TemperatureCreate {
  child_id: number;
  measured_at: string;
  temperature_celsius: number;
  notes?: string | null;
}

export interface TemperatureUpdate {
  measured_at?: string | null;
  temperature_celsius?: number | null;
  notes?: string | null;
}

export interface WeightEntry {
  id: number;
  child_id: number;
  measured_at: string;
  weight_grams: number;
  notes: string | null;
  created_at: string;
}

export interface WeightCreate {
  child_id: number;
  measured_at: string;
  weight_grams: number;
  notes?: string | null;
}

export interface WeightUpdate {
  measured_at?: string | null;
  weight_grams?: number | null;
  notes?: string | null;
}

export interface MedicationMaster {
  id: number;
  name: string;
  active_ingredient: string | null;
  default_unit: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MedicationMasterCreate {
  name: string;
  active_ingredient?: string | null;
  default_unit?: string;
  notes?: string | null;
}

export interface MedicationMasterUpdate {
  name?: string | null;
  active_ingredient?: string | null;
  default_unit?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
}

export interface MedicationEntry {
  id: number;
  child_id: number;
  given_at: string;
  medication_name: string;
  medication_master_id: number | null;
  dose: string | null;
  notes: string | null;
  created_at: string;
}

export interface MedicationCreate {
  child_id: number;
  given_at: string;
  medication_name: string;
  medication_master_id?: number | null;
  dose?: string | null;
  notes?: string | null;
}

export interface MedicationUpdate {
  given_at?: string | null;
  medication_name?: string | null;
  medication_master_id?: number | null;
  dose?: string | null;
  notes?: string | null;
}

export interface AlertConfig {
  id: number;
  child_id: number;
  wet_diaper_enabled: boolean;
  wet_diaper_min: number;
  no_stool_enabled: boolean;
  no_stool_hours: number;
  low_feeding_enabled: boolean;
  low_feeding_ml: number;
  fever_enabled: boolean;
  fever_threshold: number;
  feeding_interval_enabled: boolean;
  feeding_interval_hours: number;
}

export interface Alert {
  type: string;
  severity: "warning" | "critical";
  message: string;
  value: number | null;
  threshold: number | null;
}

export interface AlertsResponse {
  child_id: number;
  alerts: Alert[];
}

export interface HealthStatus {
  status: string;
  version: string;
  database: string;
  plugins_loaded: number;
}

export interface Tag {
  id: number;
  child_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface TagCreate {
  child_id: number;
  name: string;
  color?: string;
}

export interface TagUpdate {
  name?: string;
  color?: string;
}

export interface EntryTag {
  id: number;
  tag_id: number;
  entry_type: string;
  entry_id: number;
  tag: Tag;
}

export interface EntryTagCreate {
  tag_id: number;
  entry_type: string;
  entry_id: number;
}

export interface TodoEntry {
  id: number;
  child_id: number;
  title: string;
  details: string | null;
  due_date: string | null;
  is_done: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface TodoCreate {
  child_id: number;
  title: string;
  details?: string | null;
  due_date?: string | null;
}

export interface TodoUpdate {
  title?: string | null;
  details?: string | null;
  due_date?: string | null;
  is_done?: boolean | null;
}
