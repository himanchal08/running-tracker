import type { Activity } from '../../db/schema';
import { PRCategory, DISTANCE_CATEGORIES, TIME_EFFORT_CATEGORIES } from './personalRecords';

export interface PRTimelineEvent {
  activityId: string;
  date: Date;
  value: number;
}

export function computePRProgression(
  activities: Activity[],
  category: PRCategory
): PRTimelineEvent[] {
  const sorted = [...activities].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  
  const progression: PRTimelineEvent[] = [];
  let bestValue: number | null = null;
  
  const isTimeCat = category.startsWith('fastest_') && !category.endsWith('min');
  const isDistCat = category.endsWith('min');
  const isLongest = category === 'longest_activity';
  const isMostElev = category === 'most_elevation';

  for (const a of sorted) {
    if (a.trashedAt || a.isManualOverride) continue;
    let val: number | null = null;

    if (isTimeCat) {
      const distDef = DISTANCE_CATEGORIES.find((d) => d.category === category);
      if (distDef && a.distanceM >= distDef.distanceM * 0.98) {
        val = Math.round((a.movingTimeS / a.distanceM) * distDef.distanceM);
      }
    } else if (isDistCat) {
      const timeDef = TIME_EFFORT_CATEGORIES.find((t) => t.category === category);
      if (timeDef && a.movingTimeS >= timeDef.windowS) {
        val = (a.distanceM / a.movingTimeS) * timeDef.windowS;
      }
    } else if (isLongest) {
      val = a.distanceM;
    } else if (isMostElev) {
      val = a.elevationGainM > 0 ? a.elevationGainM : null;
    }

    if (val === null) continue;

    const isBetter = bestValue === null || (
      isTimeCat ? val < bestValue : val > bestValue
    );

    if (isBetter) {
      bestValue = val;
      progression.push({
        activityId: a.id,
        date: a.startedAt,
        value: val,
      });
    }
  }

  return progression.reverse();
}
