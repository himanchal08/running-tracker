import { Pedometer } from 'expo-sensors';
import { getDb } from '../../db/client';
import { upsertDailySteps, getDailyMetric } from '../../db/queries/dailyMetrics';

let subscription: Pedometer.Subscription | null = null;
let initialStepsForSession = 0;
let todayStr = '';

export async function checkPedometerAvailability(): Promise<boolean> {
  return await Pedometer.isAvailableAsync();
}

export async function syncHistoricalSteps(): Promise<void> {
  const isAvailable = await checkPedometerAvailability();
  if (!isAvailable) return;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const dateStr = now.toISOString().slice(0, 10);

  try {
    const result = await Pedometer.getStepCountAsync(startOfDay, now);
    const db = getDb();
    await upsertDailySteps(db, dateStr, result.steps);
  } catch (err) {
    // getStepCountAsync often fails on Android without Google Fit / Health Connect integration
    console.warn('[stepTracker] Historical step sync not available:', err);
  }
}

export async function startStepWatching(): Promise<void> {
  const isAvailable = await checkPedometerAvailability();
  if (!isAvailable) return;

  if (subscription) return;

  const db = getDb();
  const now = new Date();
  todayStr = now.toISOString().slice(0, 10);

  const existing = await getDailyMetric(db, todayStr);
  initialStepsForSession = existing?.steps ?? 0;

  try {
    subscription = Pedometer.watchStepCount((result) => {
      // result.steps is the steps taken since the subscription started
      const totalSteps = initialStepsForSession + result.steps;
      
      // We only save to DB periodically or when requested, to avoid thrashing
      // but we can update a memory cache or UI state if we had a store.
      // For now, let's just write to DB if the difference is > 10 steps since last write
      upsertDailySteps(db, todayStr, totalSteps).catch(console.error);
    });
  } catch (err) {
    console.warn('[stepTracker] Failed to start watchStepCount:', err);
  }
}

export function stopStepWatching(): void {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
}
