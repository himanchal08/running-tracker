export interface RawPoint {
  lat: number;
  lon: number;
  altitudeM: number | null;
  horizontalAccuracyM: number | null;
  speedMs: number | null;
  ts: number;
  isBarometricAltitude?: boolean;
}

export interface FilteredPoint extends RawPoint {
  isMoving: boolean;
  isFilteredOutlier: false;
}

export type MovingStatus = 'moving' | 'stationary';

export interface IngestionConfig {
  maxHorizontalAccuracyM: number;
  maxSpeedJumpMs: number;
  movingSpeedThresholdMs: number;
}

export const DEFAULT_INGESTION_CONFIG: IngestionConfig = {
  maxHorizontalAccuracyM: 25,
  maxSpeedJumpMs: 30,
  movingSpeedThresholdMs: 0.5,
};
