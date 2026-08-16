import type { RawPoint } from './types';

const ELEVATION_SMOOTHING_WINDOW = 5;

let altitudeBuffer: number[] = [];

export function resetElevationBuffer(): void {
  altitudeBuffer = [];
}

export function getSmoothedAltitudeM(point: RawPoint): number | null {
  if (point.altitudeM === null) return null;

  if (point.isBarometricAltitude) {
    return point.altitudeM;
  }

  altitudeBuffer.push(point.altitudeM);
  if (altitudeBuffer.length > ELEVATION_SMOOTHING_WINDOW) {
    altitudeBuffer.shift();
  }

  const sum = altitudeBuffer.reduce((acc, v) => acc + v, 0);
  return sum / altitudeBuffer.length;
}

export function computeElevationDelta(
  prevSmoothedM: number,
  currSmoothedM: number,
  noiseThresholdM = 2,
): { gainM: number; lossM: number } {
  const delta = currSmoothedM - prevSmoothedM;
  if (Math.abs(delta) < noiseThresholdM) {
    return { gainM: 0, lossM: 0 };
  }
  return {
    gainM: delta > 0 ? delta : 0,
    lossM: delta < 0 ? -delta : 0,
  };
}
