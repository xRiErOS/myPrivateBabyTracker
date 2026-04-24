/** Growth API — WHO percentile chart data. */

import { apiFetch } from "./client";

export interface PercentilePoint {
  age_weeks: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export interface WeightDataPoint {
  age_weeks: number;
  weight_kg: number;
  measured_at: string;
}

export interface GrowthChartData {
  child_name: string;
  gender: string | null;
  is_preterm: boolean;
  corrected_age_offset_weeks: number;
  percentile_curves: PercentilePoint[];
  measurements: WeightDataPoint[];
}

export async function getGrowthChart(childId: number): Promise<GrowthChartData> {
  return apiFetch<GrowthChartData>(`/v1/growth/chart/${childId}`);
}
