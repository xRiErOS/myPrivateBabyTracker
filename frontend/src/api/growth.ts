/** Growth API — WHO percentile chart data. */

import { apiFetch } from "./client";

export type GrowthMetric = "weight" | "length";

export interface PercentilePoint {
  age_weeks: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export interface MeasurementPoint {
  age_weeks: number;
  value: number;
  measured_at: string;
}

export interface GrowthChartData {
  child_name: string;
  gender: string | null;
  is_preterm: boolean;
  corrected_age_offset_weeks: number;
  metric: GrowthMetric;
  percentile_curves: PercentilePoint[];
  measurements: MeasurementPoint[];
}

export async function getGrowthChart(
  childId: number,
  metric: GrowthMetric = "weight"
): Promise<GrowthChartData> {
  return apiFetch<GrowthChartData>(`/v1/growth/chart/${childId}?metric=${metric}`);
}

// Backwards-compat type alias for older imports
export type WeightDataPoint = MeasurementPoint;
