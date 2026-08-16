import type { Activity } from '../../db/schema';
import { PRCategory, DISTANCE_CATEGORIES } from './personalRecords';

export interface PRTimelineEvent {
  activityId: string;
  date: Date;
  value: number;
}

export function computePRProgression(
  activities: Activity[],
  category: PRCategory
): PRTimelineEvent[] {
  const sorted = [...activities].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  
  const progression: PRTimelineEvent[] = [];
  
  const distDef = DISTANCE_CATEGORIES.find((d) => d.category === category);

  for (const a of sorted) {
    if (a.trashedAt || a.isManualOverride) continue;
    
    if (category === 'longest_activity') {
      progression.push({
        activityId: a.id,
        date: a.startedAt,
        value: a.distanceM,
      });
    } else if (distDef && a.distanceM >= distDef.distanceM * 0.98) {
      progression.push({
        activityId: a.id,
        date: a.startedAt,
        value: a.distanceM,
      });
    }
  }

  // If it's longest activity, maybe only show it if it actually was the longest at the time?
  // Let's just return all for 'longest_activity' that are above a minimum threshold (e.g., 1km)
  if (category === 'longest_activity') {
    return progression
      .filter((p) => p.value >= 1000)
      .sort((a, b) => b.value - a.value); // sort by distance instead of time for longest
  }

  return progression;
}
