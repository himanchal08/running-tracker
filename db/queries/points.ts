import { eq, asc } from 'drizzle-orm';
import type { Db } from '../client';
import { points } from '../schema';
import type { NewPoint, Point } from '../schema';

export async function insertPoint(db: Db, data: NewPoint): Promise<void> {
  await db.insert(points).values(data);
}

export async function insertPointsBatch(
  db: Db,
  pointsData: NewPoint[],
): Promise<void> {
  if (pointsData.length === 0) return;
  await db.insert(points).values(pointsData);
}

export async function getPointsForActivity(
  db: Db,
  activityId: string,
): Promise<Point[]> {
  return db
    .select()
    .from(points)
    .where(eq(points.activityId, activityId))
    .orderBy(asc(points.ts));
}

export async function getPointCountForActivity(
  db: Db,
  activityId: string,
): Promise<number> {
  const result = await db
    .select({ id: points.id })
    .from(points)
    .where(eq(points.activityId, activityId));
  return result.length;
}
