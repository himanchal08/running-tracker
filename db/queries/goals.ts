import { eq } from 'drizzle-orm';
import type { Db } from '../client';
import { goals } from '../schema';
import type { Goal } from '../schema';

export async function listActiveGoals(db: Db): Promise<Goal[]> {
  return db
    .select()
    .from(goals)
    .where(eq(goals.isActive, true));
}

export async function addGoal(
  db: Db,
  data: { metric: string; period: 'day' | 'week' | 'month'; targetValue: number; startDate: string }
): Promise<void> {
  await db.insert(goals).values({
    metric: data.metric,
    period: data.period,
    targetValue: data.targetValue,
    startDate: data.startDate,
    isActive: true,
  });
}

export async function deactivateGoal(db: Db, id: number): Promise<void> {
  await db
    .update(goals)
    .set({ isActive: false })
    .where(eq(goals.id, id));
}
