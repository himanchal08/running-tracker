import { getDb } from '../../db/client';
import { settings } from '../../db/schema';
import { eq } from 'drizzle-orm';

const BODY_WEIGHT_KEY = 'user_body_weight_kg';
const DEFAULT_WEIGHT_KG = 70;

export async function getBodyWeightKg(): Promise<number> {
  try {
    const db = getDb();
    const [row] = await db.select().from(settings).where(eq(settings.key, BODY_WEIGHT_KEY)).limit(1);
    if (!row) return DEFAULT_WEIGHT_KG;
    const parsed = parseFloat(row.value);
    return isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WEIGHT_KG;
  } catch {
    return DEFAULT_WEIGHT_KG;
  }
}

export async function setBodyWeightKg(kg: number): Promise<void> {
  const db = getDb();
  await db
    .insert(settings)
    .values({ key: BODY_WEIGHT_KEY, value: String(kg) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(kg) } });
}
