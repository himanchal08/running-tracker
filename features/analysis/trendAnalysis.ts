import type { Activity } from '../../db/schema';

export interface PeriodStats {
  startDate: Date;
  endDate: Date;
  distanceM: number;
  movingTimeS: number;
  elevationGainM: number;
  count: number;
  activeDays: number;
  avgSpeedMs: number;
  avgPaceSecPerKm: number | null;
  caloriesKcal: number;
}

export function computePeriodStats(
  activities: Activity[],
  startDate: Date,
  endDate: Date,
): PeriodStats {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const inRange = activities.filter((a) => {
    const t = a.startedAt.getTime();
    return t >= start && t <= end && a.trashedAt == null;
  });

  const activeDaySet = new Set<string>();
  let distanceM = 0;
  let movingTimeS = 0;
  let elevationGainM = 0;
  let caloriesKcal = 0;

  for (const a of inRange) {
    distanceM += a.distanceM;
    movingTimeS += a.movingTimeS;
    elevationGainM += a.elevationGainM;
    caloriesKcal += a.calorieEstimate ?? 0;
    activeDaySet.add(a.startedAt.toISOString().slice(0, 10));
  }

  const avgSpeedMs = movingTimeS > 0 ? distanceM / movingTimeS : 0;
  const avgPaceSecPerKm = distanceM > 0 ? (movingTimeS / distanceM) * 1000 : null;

  return {
    startDate,
    endDate,
    distanceM,
    movingTimeS,
    elevationGainM,
    count: inRange.length,
    activeDays: activeDaySet.size,
    avgSpeedMs,
    avgPaceSecPerKm,
    caloriesKcal,
  };
}

export interface WeekWindow {
  start: Date;
  end: Date;
}

export function getWeekWindows(n: number, referenceDate = new Date()): WeekWindow[] {
  const windows: WeekWindow[] = [];
  const ref = new Date(referenceDate);
  ref.setHours(23, 59, 59, 999);

  const day = ref.getDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(ref);
  thisMonday.setDate(ref.getDate() - daysToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  for (let i = 0; i < n; i++) {
    const start = new Date(thisMonday);
    start.setDate(thisMonday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    windows.unshift({ start, end });
  }
  return windows;
}

export interface TrendResult {
  metric: string;
  slope: number;
  direction: 'up' | 'down' | 'flat';
  isSignificant: boolean;
  latestValue: number;
  unit: string;
}

function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function computeTrends(periodStats: PeriodStats[]): TrendResult[] {
  const distances = periodStats.map((p) => p.distanceM / 1000);
  const speeds = periodStats.map((p) => p.avgSpeedMs * 3.6);
  const counts = periodStats.map((p) => p.count);
  const activeDays = periodStats.map((p) => p.activeDays);

  const metrics: Array<{ label: string; values: number[]; unit: string }> = [
    { label: 'Weekly distance', values: distances, unit: 'km' },
    { label: 'Avg speed', values: speeds, unit: 'km/h' },
    { label: 'Activity count', values: counts, unit: 'activities' },
    { label: 'Active days', values: activeDays, unit: 'days' },
  ];

  return metrics.map(({ label, values, unit }) => {
    const slope = linearSlope(values);
    const sd = stdDev(values);
    const isSignificant = sd > 0 && Math.abs(slope) > sd * 0.3;
    const direction: TrendResult['direction'] =
      slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'flat';
    return {
      metric: label,
      slope,
      direction,
      isSignificant,
      latestValue: values[values.length - 1] ?? 0,
      unit,
    };
  });
}

export function generateTrendInsight(trend: TrendResult): string | null {
  if (!trend.isSignificant) return null;
  const rounded = Math.abs(trend.slope).toFixed(1);
  if (trend.direction === 'up') {
    return `Your ${trend.metric.toLowerCase()} is trending up (+${rounded} ${trend.unit}/week).`;
  }
  if (trend.direction === 'down') {
    return `Your ${trend.metric.toLowerCase()} is trending down (-${rounded} ${trend.unit}/week).`;
  }
  return null;
}

export function getDayOfWeekDistribution(activities: Activity[]): { day: string; count: number }[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const counts = new Array(7).fill(0);
  for (const a of activities) {
    const dow = a.startedAt.getDay();
    const idx = dow === 0 ? 6 : dow - 1;
    counts[idx]++;
  }
  return days.map((day, i) => ({ day, count: counts[i] }));
}
