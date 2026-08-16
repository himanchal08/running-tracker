import type { MovingStatus, RawPoint } from './types';

export function classifyMovingStatus(
  point: RawPoint,
  haversineDerivedSpeedMs: number | null,
  thresholdMs: number,
): MovingStatus {
  const speed = point.speedMs ?? haversineDerivedSpeedMs;

  if (speed === null) {
    return 'moving';
  }

  return speed >= thresholdMs ? 'moving' : 'stationary';
}
