import type { Activity } from '../../db/schema';

export type CalendarMetric = 'distance' | 'time' | 'calories' | 'elevation' | 'count';

export interface DayData {
  date: string;
  value: number;
  activities: Activity[];
}

export interface MonthTotal {
  month: string;
  monthIndex: number;
  year: number;
  distanceM: number;
  movingTimeS: number;
  caloriesKcal: number;
  elevationGainM: number;
  count: number;
}

export interface YearTotal {
  distanceM: number;
  movingTimeS: number;
  caloriesKcal: number;
  elevationGainM: number;
  count: number;
  activeDays: number;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildDailyMap(activities: Activity[]): Map<string, DayData> {
  const map = new Map<string, DayData>();

  for (const a of activities) {
    if (!a.startedAt) continue;
    const key = toDateKey(a.startedAt);
    const existing = map.get(key);
    if (existing) {
      existing.activities.push(a);
      existing.value += a.distanceM;
    } else {
      map.set(key, { date: key, value: a.distanceM, activities: [a] });
    }
  }
  return map;
}

export function getDayValue(day: DayData, metric: CalendarMetric): number {
  switch (metric) {
    case 'distance':
      return day.activities.reduce((sum, a) => sum + a.distanceM, 0);
    case 'time':
      return day.activities.reduce((sum, a) => sum + a.movingTimeS, 0);
    case 'calories':
      return day.activities.reduce((sum, a) => sum + (a.calorieEstimate ?? 0), 0);
    case 'elevation':
      return day.activities.reduce((sum, a) => sum + a.elevationGainM, 0);
    case 'count':
      return day.activities.length;
  }
}

export function getHeatLevel(value: number, metric: CalendarMetric): 0 | 1 | 2 | 3 | 4 {
  if (value === 0) return 0;
  switch (metric) {
    case 'distance':
      if (value < 2_000) return 1;
      if (value < 5_000) return 2;
      if (value < 10_000) return 3;
      return 4;
    case 'time':
      if (value < 15 * 60) return 1;
      if (value < 30 * 60) return 2;
      if (value < 60 * 60) return 3;
      return 4;
    case 'calories':
      if (value < 100) return 1;
      if (value < 300) return 2;
      if (value < 600) return 3;
      return 4;
    case 'elevation':
      if (value < 20) return 1;
      if (value < 50) return 2;
      if (value < 100) return 3;
      return 4;
    case 'count':
      if (value === 1) return 2;
      if (value === 2) return 3;
      return 4;
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getMonthlyTotals(activities: Activity[]): MonthTotal[] {
  const map = new Map<string, MonthTotal>();

  for (const a of activities) {
    if (!a.startedAt) continue;
    const year = a.startedAt.getFullYear();
    const monthIndex = a.startedAt.getMonth();
    const key = `${year}-${monthIndex}`;

    const existing = map.get(key);
    if (existing) {
      existing.distanceM += a.distanceM;
      existing.movingTimeS += a.movingTimeS;
      existing.caloriesKcal += a.calorieEstimate ?? 0;
      existing.elevationGainM += a.elevationGainM;
      existing.count += 1;
    } else {
      map.set(key, {
        month: MONTH_NAMES[monthIndex],
        monthIndex,
        year,
        distanceM: a.distanceM,
        movingTimeS: a.movingTimeS,
        caloriesKcal: a.calorieEstimate ?? 0,
        elevationGainM: a.elevationGainM,
        count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.monthIndex - b.monthIndex;
  });
}

export function getYearlyTotals(activities: Activity[]): YearTotal {
  const activeDaySet = new Set<string>();
  let distanceM = 0;
  let movingTimeS = 0;
  let caloriesKcal = 0;
  let elevationGainM = 0;

  for (const a of activities) {
    if (!a.startedAt) continue;
    activeDaySet.add(toDateKey(a.startedAt));
    distanceM += a.distanceM;
    movingTimeS += a.movingTimeS;
    caloriesKcal += a.calorieEstimate ?? 0;
    elevationGainM += a.elevationGainM;
  }

  return {
    distanceM,
    movingTimeS,
    caloriesKcal,
    elevationGainM,
    count: activities.length,
    activeDays: activeDaySet.size,
  };
}
