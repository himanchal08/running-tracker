import type { RawPoint } from './types';

export function passesAccuracyFilter(
  point: RawPoint,
  maxAccuracyM: number,
): boolean {
  if (point.horizontalAccuracyM === null) return false;
  return point.horizontalAccuracyM <= maxAccuracyM;
}
