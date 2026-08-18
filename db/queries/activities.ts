import { eq, desc, asc, isNull, isNotNull, lte, and, inArray } from 'drizzle-orm';
import type { Db } from '../client';
import { activities } from '../schema';
import type { NewActivity, Activity } from '../schema';
import { getPointsForActivity } from './points';

export async function insertActivity(
  db: Db,
  data: NewActivity,
): Promise<Activity> {
  const [row] = await db.insert(activities).values(data).returning();
  return row;
}

export async function updateActivityLiveStats(
  db: Db,
  id: string,
  patch: Partial<Pick<
    Activity,
    | 'distanceM'
    | 'movingTimeS'
    | 'elapsedTimeS'
    | 'elevationGainM'
    | 'elevationLossM'
    | 'maxSpeedMs'
    | 'gpsQualityScore'
  >>,
): Promise<void> {
  await db.update(activities).set(patch).where(eq(activities.id, id));
}

export async function finaliseActivity(
  db: Db,
  id: string,
  endedAt: Date,
  finalStats: Pick<
    Activity,
    | 'distanceM'
    | 'movingTimeS'
    | 'elapsedTimeS'
    | 'elevationGainM'
    | 'elevationLossM'
    | 'maxSpeedMs'
    | 'gpsQualityScore'
    | 'calorieEstimate'
    | 'type'
  >,
): Promise<Activity> {
  const avgSpeedMs =
    finalStats.movingTimeS > 0
      ? finalStats.distanceM / finalStats.movingTimeS
      : null;

  const [row] = await db
    .update(activities)
    .set({ ...finalStats, endedAt, avgSpeedMs })
    .where(eq(activities.id, id))
    .returning();
  return row;
}

export async function getActivity(db: Db, id: string): Promise<Activity | null> {
  const [row] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);
  return row ?? null;
}

export async function listActivities(
  db: Db,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<Activity[]> {
  return db
    .select()
    .from(activities)
    .where(isNull(activities.trashedAt))
    .orderBy(desc(activities.startedAt))
    .limit(limit)
    .offset(offset);
}

export async function listTrashedActivities(db: Db): Promise<Activity[]> {
  return db
    .select()
    .from(activities)
    .where(isNotNull(activities.trashedAt))
    .orderBy(desc(activities.trashedAt));
}

export async function trashActivity(db: Db, id: string): Promise<void> {
  await db
    .update(activities)
    .set({ trashedAt: new Date() })
    .where(eq(activities.id, id));
}

export async function restoreActivity(db: Db, id: string): Promise<void> {
  await db
    .update(activities)
    .set({ trashedAt: null })
    .where(eq(activities.id, id));
}

export async function getCurrentStreak(db: Db): Promise<{ current: number, isAliveToday: boolean }> {
  // Fetch all activity dates descending
  const acts = await db
    .select({ startedAt: activities.startedAt })
    .from(activities)
    .where(isNull(activities.trashedAt))
    .orderBy(desc(activities.startedAt));

  if (acts.length === 0) return { current: 0, isAliveToday: false };

  const dates = acts.map(a => new Date(a.startedAt).toISOString().slice(0, 10));
  // Unique dates sorted descending
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  // If the last activity wasn't today or yesterday, the streak is broken
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    return { current: 0, isAliveToday: false };
  }

  let streak = 0;
  let currentDate = new Date(); // Start checking from today
  const isAliveToday = uniqueDates[0] === todayStr;

  // We loop backwards day by day. If that date exists in uniqueDates, streak++
  // If not, and it's not today (meaning we missed today but ran yesterday), we break.
  for (let i = 0; i < 3650; i++) { // Max 10 year streak safeguard
    const checkDateStr = currentDate.toISOString().slice(0, 10);
    
    if (uniqueDates.includes(checkDateStr)) {
      streak++;
    } else {
      // If we are checking today and it's missing, that's fine (streak relies on yesterday)
      if (i === 0) {
        // do nothing, check yesterday
      } else {
        // We missed a day, streak ends here
        break;
      }
    }
    // move back one day
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return { current: streak, isAliveToday };
}


export async function hardDeleteTrashedBefore(
  db: Db,
  cutoffDate: Date,
): Promise<void> {
  await db
    .delete(activities)
    .where(lte(activities.trashedAt, cutoffDate));
}

export async function setActivityType(
  db: Db,
  id: string,
  type: Activity['type'],
): Promise<void> {
  await db
    .update(activities)
    .set({ type, isManualOverride: true })
    .where(eq(activities.id, id));
}

export async function autoUpdateActivityType(
  db: Db,
  id: string,
  type: Activity['type'],
): Promise<void> {
  await db
    .update(activities)
    .set({ type })
    .where(and(eq(activities.id, id), eq(activities.isManualOverride, false)));
}

export async function deleteActivities(db: Db, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(activities).where(inArray(activities.id, ids));
}
