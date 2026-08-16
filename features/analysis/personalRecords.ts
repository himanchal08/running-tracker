import type { Activity, Point, PersonalRecord } from '../../db/schema';

export type PRCategory =
  | 'fastest_1k'
  | 'fastest_3k'
  | 'fastest_5k'
  | 'fastest_10k'
  | 'fastest_half'
  | 'fastest_marathon'
  | 'fastest_30min'
  | 'fastest_60min'
  | 'longest_activity'
  | 'most_elevation';

export const PR_LABELS: Record<PRCategory, string> = {
  fastest_1k:       'Fastest 1 km',
  fastest_3k:       'Fastest 3 km',
  fastest_5k:       'Fastest 5 km',
  fastest_10k:      'Fastest 10 km',
  fastest_half:     'Fastest half marathon',
  fastest_marathon: 'Fastest marathon',
  fastest_30min:    'Furthest in 30 min',
  fastest_60min:    'Furthest in 60 min',
  longest_activity: 'Longest activity',
  most_elevation:   'Most elevation in one activity',
};

const DISTANCE_CATEGORIES: { category: PRCategory; distanceM: number }[] = [
  { category: 'fastest_1k',       distanceM: 1_000 },
  { category: 'fastest_3k',       distanceM: 3_000 },
  { category: 'fastest_5k',       distanceM: 5_000 },
  { category: 'fastest_10k',      distanceM: 10_000 },
  { category: 'fastest_half',     distanceM: 21_097.5 },
  { category: 'fastest_marathon', distanceM: 42_195 },
];

const TIME_EFFORT_CATEGORIES: { category: PRCategory; windowS: number }[] = [
  { category: 'fastest_30min', windowS: 30 * 60 },
  { category: 'fastest_60min', windowS: 60 * 60 },
];

export interface NewPR {
  category: PRCategory;
  value: number;
  activityId: string;
  achievedAt: Date;
  isImprovement: boolean;
  previousValue: number | null;
}

function isBetter(category: PRCategory, newValue: number, existingValue: number): boolean {
  if (
    category.startsWith('fastest_30') ||
    category.startsWith('fastest_60') ||
    category === 'longest_activity' ||
    category === 'most_elevation'
  ) {
    return newValue > existingValue;
  }
  return newValue < existingValue;
}

function approximateBestTime(
  activity: Activity,
  targetDistanceM: number,
): number | null {
  if (activity.distanceM < targetDistanceM) return null;
  if (activity.movingTimeS <= 0) return null;
  const paceSecPerM = activity.movingTimeS / activity.distanceM;
  return Math.round(paceSecPerM * targetDistanceM);
}

function rollingWindowBestTime(
  points: Point[],
  targetDistanceM: number,
): number | null {
  if (points.length < 2) return null;

  const cumDist: number[] = [0];
  const timestamps: number[] = [points[0].ts.getTime()];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const d = haversineM(prev.lat, prev.lon, curr.lat, curr.lon);
    cumDist.push(cumDist[cumDist.length - 1] + d);
    timestamps.push(curr.ts.getTime());
  }

  const totalDist = cumDist[cumDist.length - 1];
  if (totalDist < targetDistanceM) return null;

  let bestTimeMs = Infinity;
  let left = 0;

  for (let right = 1; right < points.length; right++) {
    const coveredDist = cumDist[right] - cumDist[left];

    while (left < right && cumDist[right] - cumDist[left + 1] >= targetDistanceM) {
      left++;
    }

    if (coveredDist >= targetDistanceM) {
      const elapsed = timestamps[right] - timestamps[left];
      if (elapsed > 0 && elapsed < bestTimeMs) {
        bestTimeMs = elapsed;
      }
    }
  }

  return bestTimeMs === Infinity ? null : Math.round(bestTimeMs / 1000);
}

function rollingWindowBestDistance(
  points: Point[],
  windowS: number,
): number | null {
  if (points.length < 2) return null;
  if (points[points.length - 1].ts.getTime() - points[0].ts.getTime() < windowS * 1000) {
    return null;
  }

  const cumDist: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    cumDist.push(cumDist[cumDist.length - 1] + haversineM(prev.lat, prev.lon, curr.lat, curr.lon));
  }

  let bestDist = 0;
  let left = 0;

  for (let right = 1; right < points.length; right++) {
    const windowMs = windowS * 1000;
    while (left < right && points[right].ts.getTime() - points[left].ts.getTime() > windowMs) {
      left++;
    }
    const dist = cumDist[right] - cumDist[left];
    if (dist > bestDist) bestDist = dist;
  }

  return bestDist > 0 ? Math.round(bestDist) : null;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function detectPRs(
  activity: Activity,
  points: Point[],
  existingPRs: PersonalRecord[],
): NewPR[] {
  const results: NewPR[] = [];
  const existingMap = new Map<string, PersonalRecord>(
    existingPRs.map((pr) => [pr.category, pr]),
  );

  const achievedAt = activity.endedAt ?? activity.startedAt;
  const usePoints = points.length >= 2;

  for (const { category, distanceM } of DISTANCE_CATEGORIES) {
    if (activity.distanceM < distanceM * 0.98) continue;

    const bestTime = usePoints
      ? rollingWindowBestTime(points, distanceM)
      : approximateBestTime(activity, distanceM);

    if (bestTime === null) continue;

    const existing = existingMap.get(category);
    const isImprovement = existing == null || isBetter(category, bestTime, existing.value);

    if (isImprovement) {
      results.push({
        category,
        value: bestTime,
        activityId: activity.id,
        achievedAt,
        isImprovement: existing != null,
        previousValue: existing?.value ?? null,
      });
    }
  }

  for (const { category, windowS } of TIME_EFFORT_CATEGORIES) {
    if (activity.movingTimeS < windowS) continue;

    const bestDist = usePoints ? rollingWindowBestDistance(points, windowS) : null;
    if (bestDist === null) continue;

    const existing = existingMap.get(category);
    const isImprovement = existing == null || isBetter(category, bestDist, existing.value);

    if (isImprovement) {
      results.push({
        category,
        value: bestDist,
        activityId: activity.id,
        achievedAt,
        isImprovement: existing != null,
        previousValue: existing?.value ?? null,
      });
    }
  }

  {
    const category: PRCategory = 'longest_activity';
    const existing = existingMap.get(category);
    if (existing == null || isBetter(category, activity.distanceM, existing.value)) {
      results.push({
        category,
        value: activity.distanceM,
        activityId: activity.id,
        achievedAt,
        isImprovement: existing != null,
        previousValue: existing?.value ?? null,
      });
    }
  }

  {
    const category: PRCategory = 'most_elevation';
    const existing = existingMap.get(category);
    if (existing == null || isBetter(category, activity.elevationGainM, existing.value)) {
      if (activity.elevationGainM > 0) {
        results.push({
          category,
          value: activity.elevationGainM,
          activityId: activity.id,
          achievedAt,
          isImprovement: existing != null,
          previousValue: existing?.value ?? null,
        });
      }
    }
  }

  return results;
}
