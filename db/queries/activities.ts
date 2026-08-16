import { eq, desc, isNull, isNotNull, lte, and } from 'drizzle-orm';
import type { Db } from '../client';
import { activities } from '../schema';
import type { NewActivity, Activity } from '../schema';
import { getPointsForActivity } from './points';
import { listPRs, savePRIfBetter, clearAllPRs } from './personalRecords';
import { detectPRs } from '../../features/analysis/personalRecords';

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
  await recomputeAllPRs(db);
}

export async function restoreActivity(db: Db, id: string): Promise<void> {
  await db
    .update(activities)
    .set({ trashedAt: null })
    .where(eq(activities.id, id));
  await recomputeAllPRs(db);
}

export async function recomputeAllPRs(db: Db): Promise<void> {
  try {
    await clearAllPRs(db);

    const allActivities = await db
      .select()
      .from(activities)
      .where(isNull(activities.trashedAt))
      .orderBy(desc(activities.startedAt));

    for (const activity of allActivities) {
      const pts = await getPointsForActivity(db, activity.id);
      const existingPRs = await listPRs(db);
      const detected = detectPRs(activity, pts.filter((p) => !p.isFilteredOutlier), existingPRs);
      await Promise.all(detected.map((pr) => savePRIfBetter(db, pr)));
    }
  } catch (err) {
    console.error('[recomputeAllPRs] failed:', err);
  }
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
