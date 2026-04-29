/** TypeScript interfaces matching backend Pydantic schemas. */

export type Gender = "male" | "female" | "other";

export interface Child {
  id: number;
  name: string;
  birth_date: string;
  estimated_birth_date: string | null;
  is_preterm: boolean;
  gender: Gender | null;
  birth_weight_g: number | null;
  birth_length_cm: number | string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ChildCreate {
  name: string;
  birth_date: string;
  estimated_birth_date?: string | null;
  is_preterm?: boolean;
  gender?: Gender | null;
  birth_weight_g?: number | null;
  birth_length_cm?: number | string | null;
  notes?: string | null;
}

export interface ChildUpdate {
  name?: string;
  birth_date?: string;
  estimated_birth_date?: string | null;
  is_preterm?: boolean;
  gender?: Gender | null;
  birth_weight_g?: number | null;
  birth_length_cm?: number | string | null;
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
  leap_storm_enabled: boolean;
  min_age_weeks: number | null;
  max_age_weeks: number | null;
}

export interface Alert {
  type: string;
  severity: "warning" | "critical" | "info";
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
  is_archived: boolean;
  created_at: string;
  entry_summary: string | null;
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

export type HealthEntryType = "spit_up" | "tummy_ache" | "crying";
export type HealthSeverity = "mild" | "moderate" | "severe";
export type HealthDuration = "short" | "medium" | "long";
export type SoothingMethod = "nursing" | "rocking" | "carrying" | "pacifier" | "singing" | "white_noise" | "swaddling" | "other";

export interface HealthEntry {
  id: number;
  child_id: number;
  entry_type: HealthEntryType;
  severity: HealthSeverity;
  duration: HealthDuration | null;
  duration_minutes: number | null;
  soothing_method: SoothingMethod | null;
  time: string;
  notes: string | null;
  feeding_id: number | null;
  created_at: string;
}

export interface HealthCreate {
  child_id: number;
  entry_type: HealthEntryType;
  severity: HealthSeverity;
  duration?: HealthDuration | null;
  duration_minutes?: number | null;
  soothing_method?: SoothingMethod | null;
  time: string;
  notes?: string | null;
  feeding_id?: number | null;
}

export interface HealthUpdate {
  entry_type?: HealthEntryType | null;
  severity?: HealthSeverity | null;
  duration?: HealthDuration | null;
  duration_minutes?: number | null;
  soothing_method?: SoothingMethod | null;
  time?: string | null;
  notes?: string | null;
  feeding_id?: number | null;
}

export interface TummyTimeEntry {
  id: number;
  child_id: number;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface TummyTimeCreate {
  child_id: number;
  start_time: string;
  end_time?: string | null;
  notes?: string | null;
}

export interface TummyTimeUpdate {
  start_time?: string;
  end_time?: string | null;
  notes?: string | null;
}

export type ApiKeyScope = "read" | "write" | "admin";

export interface ApiKeyResponse {
  id: number;
  name: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyCreateResponse extends ApiKeyResponse {
  key: string;
}

export interface ApiKeyCreate {
  name: string;
  scopes?: ApiKeyScope[];
}

export interface ApiKeyUpdate {
  name?: string | null;
  scopes?: ApiKeyScope[] | null;
  is_active?: boolean | null;
}

// --- Milestones ---

export type MilestoneSourceType = "medical" | "emotional" | "custom" | "leap";
export type MilestoneConfidence = "exact" | "approximate" | "unsure";
export type LeapStatus = "past" | "active_storm" | "active_sun" | "upcoming" | "far_future";

export interface MilestoneCategory {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  is_system: boolean;
  child_id: number | null;
  created_at: string;
}

export interface CategoryCreate {
  name: string;
  color?: string;
  icon?: string | null;
  child_id: number;
}

export interface CategoryUpdate {
  name?: string;
  color?: string;
  icon?: string | null;
}

export interface MilestoneTemplate {
  id: number;
  title: string;
  description: string | null;
  category_id: number;
  source_type: MilestoneSourceType;
  suggested_age_weeks_min: number | null;
  suggested_age_weeks_max: number | null;
  sort_order: number;
  created_at: string;
}

export interface MilestoneSuggestion {
  id: number;
  title: string;
  description: string | null;
  category_id: number;
  source_type: MilestoneSourceType;
  suggested_age_weeks_min: number | null;
  suggested_age_weeks_max: number | null;
  is_completed: boolean;
  is_current: boolean;
}

export interface MilestonePhoto {
  id: number;
  milestone_entry_id: number;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface MilestoneEntry {
  id: number;
  child_id: number;
  template_id: number | null;
  title: string;
  category_id: number;
  source_type: MilestoneSourceType;
  completed: boolean;
  completed_date: string | null;
  confidence: MilestoneConfidence;
  notes: string | null;
  photos: MilestonePhoto[];
  created_at: string;
}

export interface MilestoneCreate {
  child_id: number;
  template_id?: number | null;
  title: string;
  category_id: number;
  source_type?: MilestoneSourceType;
  completed?: boolean;
  completed_date?: string | null;
  confidence?: MilestoneConfidence;
  notes?: string | null;
}

export interface MilestoneUpdate {
  title?: string;
  category_id?: number;
  completed?: boolean;
  completed_date?: string | null;
  confidence?: MilestoneConfidence;
  notes?: string | null;
}

export interface MilestoneCompleteRequest {
  completed_date: string;
  confidence?: MilestoneConfidence;
  notes?: string | null;
}

export interface LeapDefinition {
  id: number;
  leap_number: number;
  title: string;
  description: string;
  storm_start_weeks: number;
  storm_end_weeks: number;
  sun_start_weeks: number;
  new_skills: string | null;
  storm_signs: string | null;
  sort_order: number;
  created_at: string;
}

export interface LeapStatusItem {
  id: number;
  leap_number: number;
  title: string;
  description: string;
  storm_start_weeks: number;
  storm_end_weeks: number;
  sun_start_weeks: number;
  new_skills: string | null;
  storm_signs: string | null;
  status: LeapStatus;
  storm_start_date: string | null;
  storm_end_date: string | null;
  sun_start_date: string | null;
}

export interface LeapStatusResponse {
  child_age_weeks: number;
  reference_date: string;
  leaps: LeapStatusItem[];
  active_leap: LeapStatusItem | null;
}

// --- Media Management ---

export interface MediaPhoto {
  id: number;
  milestone_entry_id: number;
  milestone_title: string;
  category_id: number;
  child_id: number;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface StorageInfo {
  total_photos: number;
  total_size_bytes: number;
  total_size_with_thumbs_bytes: number;
}

// --- Todo Templates ---

export interface TodoTemplate {
  id: number;
  child_id: number;
  title: string;
  details: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TodoTemplateCreate {
  child_id: number;
  title: string;
  details?: string | null;
}

export interface TodoTemplateUpdate {
  title?: string;
  details?: string | null;
  is_active?: boolean;
}

// --- Habits ---

export type HabitRecurrence = "daily" | "weekly";

export interface Habit {
  id: number;
  child_id: number;
  title: string;
  details: string | null;
  recurrence: HabitRecurrence;
  weekdays: number[] | null;
  is_active: boolean;
  streak: number;
  completed_today: boolean;
  created_at: string;
}

export interface HabitCreate {
  child_id: number;
  title: string;
  details?: string | null;
  recurrence?: HabitRecurrence;
  weekdays?: number[] | null;
}

export interface HabitUpdate {
  title?: string;
  details?: string | null;
  recurrence?: HabitRecurrence;
  weekdays?: number[] | null;
  is_active?: boolean;
}

export interface HabitCompletion {
  id: number;
  habit_id: number;
  child_id: number;
  completed_date: string;
  completed_at: string;
}
