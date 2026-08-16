import { eq, desc } from 'drizzle-orm';
import type { Db } from '../client';
import { routes, routeAttempts, activities } from '../schema';
import type { Route, RouteAttempt, Activity } from '../schema';

export async function listRoutes(db: Db): Promise<Route[]> {
  return db
    .select()
    .from(routes)
    .orderBy(desc(routes.timesRepeated));
}

export async function getRoute(db: Db, routeId: string): Promise<Route | null> {
  const [row] = await db
    .select()
    .from(routes)
    .where(eq(routes.id, routeId))
    .limit(1);
  return row ?? null;
}

export async function upsertRoute(
  db: Db,
  data: {
    id: string;
    canonicalPolyline: string;
    firstSeenAt: Date;
    displayName?: string;
  },
): Promise<void> {
  const existing = await getRoute(db, data.id);
  if (!existing) {
    await db.insert(routes).values({
      id: data.id,
      canonicalPolyline: data.canonicalPolyline,
      firstSeenAt: data.firstSeenAt,
      timesRepeated: 1,
      displayName: data.displayName ?? null,
    });
  } else {
    await db
      .update(routes)
      .set({ timesRepeated: existing.timesRepeated + 1 })
      .where(eq(routes.id, data.id));
  }
}

export async function saveRouteAttempt(
  db: Db,
  data: {
    routeId: string;
    activityId: string;
    deltaVsBestS: number | null;
  },
): Promise<void> {
  await db.insert(routeAttempts).values({
    routeId: data.routeId,
    activityId: data.activityId,
    deltaVsBestS: data.deltaVsBestS ?? null,
  });
}

export async function listAttemptsForRoute(
  db: Db,
  routeId: string,
): Promise<{ attempt: RouteAttempt; activity: Activity }[]> {
  const rows = await db
    .select({
      attempt: routeAttempts,
      activity: activities,
    })
    .from(routeAttempts)
    .innerJoin(activities, eq(routeAttempts.activityId, activities.id))
    .where(eq(routeAttempts.routeId, routeId))
    .orderBy(desc(activities.startedAt));

  return rows;
}

export async function getAllRouteCandidates(
  db: Db,
): Promise<Pick<Route, 'id' | 'canonicalPolyline'>[]> {
  return db
    .select({ id: routes.id, canonicalPolyline: routes.canonicalPolyline })
    .from(routes);
}
