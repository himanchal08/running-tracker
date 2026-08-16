import type { Activity } from '../../db/schema';

export interface WeekStats {
  weekStart: Date;
  distanceM: number;
  movingTimeS: number;
  caloriesKcal: number;
  elevationGainM: number;
  count: number;
  activeDays: number;
  avgSpeedMs: number;
  avgPaceSecPerKm: number | null;
  longestActivityDistM: number;
  fastestActivitySpeedMs: number | null;
}

export interface WeekDelta {
  distancePct: number | null;
  timePct: number | null;
  countPct: number | null;
  elevationPct: number | null;
  activeDaysDelta: number;
  avgSpeedPct: number | null;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function filterWeekActivities(activities: Activity[], weekStart: Date): Activity[] {
  const start = weekStart.getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return activities.filter((a) => {
    const t = a.startedAt.getTime();
    return t >= start && t < end;
  });
}

export function computeWeekStats(activities: Activity[], weekStart: Date): WeekStats {
  const week = filterWeekActivities(activities, weekStart);
  const activeDaySet = new Set<string>();

  let distanceM = 0;
  let movingTimeS = 0;
  let caloriesKcal = 0;
  let elevationGainM = 0;
  let longestActivityDistM = 0;
  let fastestActivitySpeedMs: number | null = null;

  for (const a of week) {
    distanceM += a.distanceM;
    movingTimeS += a.movingTimeS;
    caloriesKcal += a.calorieEstimate ?? 0;
    elevationGainM += a.elevationGainM;
    longestActivityDistM = Math.max(longestActivityDistM, a.distanceM);
    if (a.avgSpeedMs != null) {
      fastestActivitySpeedMs =
        fastestActivitySpeedMs === null
          ? a.avgSpeedMs
          : Math.max(fastestActivitySpeedMs, a.avgSpeedMs);
    }

    const dayKey = a.startedAt.toISOString().slice(0, 10);
    activeDaySet.add(dayKey);
  }

  const avgSpeedMs = movingTimeS > 0 ? distanceM / movingTimeS : 0;
  const avgPaceSecPerKm =
    distanceM > 0 ? (movingTimeS / distanceM) * 1000 : null;

  return {
    weekStart,
    distanceM,
    movingTimeS,
    caloriesKcal,
    elevationGainM,
    count: week.length,
    activeDays: activeDaySet.size,
    avgSpeedMs,
    avgPaceSecPerKm,
    longestActivityDistM,
    fastestActivitySpeedMs,
  };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function computeWeekDelta(thisWeek: WeekStats, lastWeek: WeekStats): WeekDelta {
  return {
    distancePct: pctChange(thisWeek.distanceM, lastWeek.distanceM),
    timePct: pctChange(thisWeek.movingTimeS, lastWeek.movingTimeS),
    countPct: pctChange(thisWeek.count, lastWeek.count),
    elevationPct: pctChange(thisWeek.elevationGainM, lastWeek.elevationGainM),
    activeDaysDelta: thisWeek.activeDays - lastWeek.activeDays,
    avgSpeedPct: pctChange(thisWeek.avgSpeedMs, lastWeek.avgSpeedMs),
  };
}

export function generateWeeklySummary(
  thisWeek: WeekStats,
  delta: WeekDelta,
): string {
  if (thisWeek.count === 0) {
    return 'No activities recorded this week. Lace up and get moving!';
  }

  const parts: string[] = [];

  if (delta.distancePct !== null) {
    const sign = delta.distancePct >= 0 ? '+' : '';
    if (Math.abs(delta.distancePct) >= 5) {
      parts.push(
        delta.distancePct >= 0
          ? `You covered ${sign}${delta.distancePct}% more distance than last week.`
          : `You covered ${Math.abs(delta.distancePct)}% less distance than last week.`,
      );
    }
  } else if (thisWeek.distanceM > 0) {
    parts.push('First week with recorded distance — great start!');
  }

  if (delta.countPct !== null && Math.abs(delta.countPct) >= 20) {
    parts.push(
      delta.countPct >= 0
        ? `You were more active this week (${thisWeek.count} ${thisWeek.count === 1 ? 'activity' : 'activities'} vs. last week).`
        : `Fewer activities this week (${thisWeek.count}).`,
    );
  } else {
    parts.push(`You completed ${thisWeek.count} ${thisWeek.count === 1 ? 'activity' : 'activities'} across ${thisWeek.activeDays} ${thisWeek.activeDays === 1 ? 'day' : 'days'}.`);
  }

  if (delta.activeDaysDelta > 0) {
    parts.push(`You were active ${delta.activeDaysDelta} more ${delta.activeDaysDelta === 1 ? 'day' : 'days'} than last week.`);
  } else if (delta.activeDaysDelta < 0) {
    parts.push(`You were active ${Math.abs(delta.activeDaysDelta)} fewer ${Math.abs(delta.activeDaysDelta) === 1 ? 'day' : 'days'} than last week.`);
  }

  if (delta.avgSpeedPct !== null && delta.avgSpeedPct >= 5) {
    parts.push(`Your average speed improved by ${delta.avgSpeedPct}% — keep it up!`);
  }

  return parts.join(' ');
}
