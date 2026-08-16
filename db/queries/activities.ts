import { eq, desc, isNull, isNotNull, lte } from 'drizzle-orm';
import type { Db } from '../client';
import { activities } from '../schema';
import type { NewActivity, Activity } from '../schema';

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
}

export async function restoreActivity(db: Db, id: string): Promise<void> {
  await db
    .update(activities)
    .set({ trashedAt: null })
    .where(eq(activities.id, id));
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
