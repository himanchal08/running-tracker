import { eq, desc } from 'drizzle-orm';
import type { Db } from '../client';
import { personalRecords } from '../schema';
import type { PersonalRecord } from '../schema';
import type { NewPR } from '../../features/analysis/personalRecords';

export async function listPRs(db: Db): Promise<PersonalRecord[]> {
  return db.select().from(personalRecords).orderBy(desc(personalRecords.achievedAt));
}

export async function savePRIfBetter(db: Db, newPR: NewPR): Promise<void> {
  const [existing] = await db
    .select()
    .from(personalRecords)
    .where(eq(personalRecords.category, newPR.category))
    .limit(1);

  if (!existing) {
    await db.insert(personalRecords).values({
      category: newPR.category,
      value: newPR.value,
      activityId: newPR.activityId,
      achievedAt: newPR.achievedAt,
    });
    return;
  }

  const isBetter = newPR.isImprovement;
  if (isBetter) {
    await db
      .update(personalRecords)
      .set({
        value: newPR.value,
        activityId: newPR.activityId,
        achievedAt: newPR.achievedAt,
      })
      .where(eq(personalRecords.category, newPR.category));
  }
}

export async function deletePRsForActivity(db: Db, activityId: string): Promise<void> {
  await db
    .delete(personalRecords)
    .where(eq(personalRecords.activityId, activityId));
}

export async function clearAllPRs(db: Db): Promise<void> {
  await db.delete(personalRecords);
}
