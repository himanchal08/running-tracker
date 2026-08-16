import type { RawPoint } from './types';

export function haversineDistanceM(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function passesOutlierFilter(
  prevPoint: RawPoint | null,
  newPoint: RawPoint,
  maxSpeedJumpMs: number,
): boolean {
  if (!prevPoint) return true;

  const timeDeltaS = (newPoint.ts - prevPoint.ts) / 1000;
  if (timeDeltaS <= 0) return false;

  const distM = haversineDistanceM(prevPoint.lat, prevPoint.lon, newPoint.lat, newPoint.lon);
  const impliedSpeedMs = distM / timeDeltaS;

  return impliedSpeedMs <= maxSpeedJumpMs;
}
