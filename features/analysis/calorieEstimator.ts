export type ActivityType = 'walking' | 'running' | 'cycling' | 'hiking' | 'unknown';

function metForActivity(type: ActivityType, avgSpeedMs: number | null): number {
  const speedKmh = (avgSpeedMs ?? 0) * 3.6;

  switch (type) {
    case 'running': {
      const met = 8.0 + Math.max(0, speedKmh - 8) * 0.8;
      return Math.min(met, 16.0);
    }
    case 'cycling': {
      if (speedKmh < 16) return 4.0;
      if (speedKmh < 20) return 6.0;
      if (speedKmh < 25) return 8.0;
      return 12.0;
    }
    case 'hiking':
      return 6.0;
    case 'walking': {
      if (speedKmh < 3) return 2.5;
      if (speedKmh < 5) return 3.5;
      return 5.0;
    }
    case 'unknown':
    default:
      return 5.0;
  }
}
export function estimateCalories(
  type: ActivityType,
  weightKg: number,
  movingTimeS: number,
  avgSpeedMs: number | null,
): number {
  if (movingTimeS <= 0 || weightKg <= 0) return 0;
  const met = metForActivity(type, avgSpeedMs);
  const durationHours = movingTimeS / 3600;
  return Math.round(met * weightKg * durationHours);
}
