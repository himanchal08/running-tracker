import type { Activity } from '../../db/schema';

export type PRCategory =
  | 'completed_5k'
  | 'completed_10k'
  | 'completed_20k'
  | 'completed_half'
  | 'completed_marathon'
  | 'longest_activity';

export const PR_LABELS: Record<PRCategory, string> = {
  completed_5k: 'Completed 5 km',
  completed_10k: 'Completed 10 km',
  completed_20k: 'Completed 20 km',
  completed_half: 'Completed Half Marathon',
  completed_marathon: 'Completed Marathon',
  longest_activity: 'Longest activity',
};

export const DISTANCE_CATEGORIES: { category: PRCategory; distanceM: number }[] = [
  { category: 'completed_5k', distanceM: 5_000 },
  { category: 'completed_10k', distanceM: 10_000 },
  { category: 'completed_20k', distanceM: 20_000 },
  { category: 'completed_half', distanceM: 21_097.5 },
  { category: 'completed_marathon', distanceM: 42_195 },
];

export interface NewPR {
  category: PRCategory;
  value: number; // Value will just be the distance completed
  activityId: string;
  achievedAt: Date;
  isImprovement: boolean;
  previousValue: number | null;
}

export function detectPRs(
  activity: Activity,
  _points: any[], // ignored now
  existingPRs: { category: string; value: number }[],
): NewPR[] {
  const results: NewPR[] = [];
  const existingMap = new Map<string, number>(
    existingPRs.map((pr) => [pr.category, pr.value]),
  );

  const achievedAt = activity.endedAt ?? activity.startedAt;

  for (const { category, distanceM } of DISTANCE_CATEGORIES) {
    if (activity.distanceM >= distanceM * 0.98) {
      const existing = existingMap.has(category);
      if (!existing) {
        results.push({
          category,
          value: activity.distanceM,
          activityId: activity.id,
          achievedAt,
          isImprovement: false,
          previousValue: null,
        });
      }
    }
  }

  {
    const category: PRCategory = 'longest_activity';
    const existingVal = existingMap.get(category);
    if (existingVal == null || activity.distanceM > existingVal) {
      results.push({
        category,
        value: activity.distanceM,
        activityId: activity.id,
        achievedAt,
        isImprovement: existingVal != null,
        previousValue: existingVal ?? null,
      });
    }
  }

  return results;
}
