import { eq, asc, and, gte, isNull, count } from 'drizzle-orm';
import type { Db } from '../client';
import { points, activities } from '../schema';
import type { NewPoint, Point, Activity } from '../schema';

export interface HeatmapPoint {
  activityId: string;
  lat: number;
  lon: number;
}

export async function getAllPointsForHeatmap(
  db: Db,
  opts: {
    activityType?: Activity['type'] | 'all';
    cutoffDate?: Date;
  } = {},
): Promise<HeatmapPoint[]> {
  const { activityType, cutoffDate } = opts;

  const activityConditions = [isNull(activities.trashedAt)];
  if (activityType && activityType !== 'all') {
    activityConditions.push(eq(activities.type, activityType));
  }
  if (cutoffDate) {
    activityConditions.push(gte(activities.startedAt, cutoffDate));
  }

  const rows = await db
    .select({
      activityId: points.activityId,
      lat: points.lat,
      lon: points.lon,
    })
    .from(points)
    .innerJoin(activities, eq(points.activityId, activities.id))
    .where(
      and(
        eq(points.isFilteredOutlier, false),
        ...activityConditions,
      ),
    )
    .orderBy(asc(points.activityId), asc(points.ts));

  return rows;
}

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
  // Use COUNT(*) — avoids loading every column of every row into memory.
  const [row] = await db
    .select({ n: count() })
    .from(points)
    .where(eq(points.activityId, activityId));
  return row?.n ?? 0;
}

