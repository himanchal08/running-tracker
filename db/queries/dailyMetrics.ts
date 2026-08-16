import { eq, between, and } from 'drizzle-orm';
import type { Db } from '../client';
import { dailyMetrics } from '../schema';
import type { DailyMetric } from '../schema';

export async function getDailyMetric(db: Db, date: string): Promise<DailyMetric | null> {
  const [row] = await db
    .select()
    .from(dailyMetrics)
    .where(eq(dailyMetrics.date, date))
    .limit(1);
  return row ?? null;
}

export async function upsertDailySteps(db: Db, date: string, steps: number): Promise<void> {
  const existing = await getDailyMetric(db, date);
  if (existing) {
    await db
      .update(dailyMetrics)
      .set({ steps, updatedAt: new Date() })
      .where(eq(dailyMetrics.date, date));
  } else {
    await db.insert(dailyMetrics).values({
      date,
      steps,
      updatedAt: new Date(),
    });
  }
}

export async function getDailyMetricsRange(db: Db, startDate: string, endDate: string): Promise<DailyMetric[]> {
  return db
    .select()
    .from(dailyMetrics)
    .where(between(dailyMetrics.date, startDate, endDate))
    .orderBy(dailyMetrics.date);
}
