import { passesAccuracyFilter } from './accuracyFilter';
import { passesOutlierFilter, haversineDistanceM } from './outlierReject';
import { classifyMovingStatus } from './movingTimeLogic';
import { getSmoothedAltitudeM, computeElevationDelta, resetElevationBuffer } from './elevationFilter';
import {
  type RawPoint,
  type FilteredPoint,
  type IngestionConfig,
  DEFAULT_INGESTION_CONFIG,
} from './types';

export class IngestionPipeline {
  private prevAcceptedPoint: RawPoint | null = null;
  private prevSmoothedAltM: number | null = null;

  public cumulativeDistanceM = 0;
  public movingTimeS = 0;
  public elapsedTimeS = 0;
  public elevationGainM = 0;
  public elevationLossM = 0;

  constructor(private readonly config: IngestionConfig = DEFAULT_INGESTION_CONFIG) {}

  reset(): void {
    this.prevAcceptedPoint = null;
    this.prevSmoothedAltM = null;
    this.cumulativeDistanceM = 0;
    this.movingTimeS = 0;
    this.elapsedTimeS = 0;
    this.elevationGainM = 0;
    this.elevationLossM = 0;
    resetElevationBuffer();
  }

  /**
   * Seeds cumulative stats from persisted DB values so that after an app restart
   * the pipeline continues accumulating from the correct baseline.
   */
  restoreState(state: {
    cumulativeDistanceM: number;
    movingTimeS: number;
    elapsedTimeS: number;
    elevationGainM: number;
    elevationLossM: number;
  }): void {
    this.cumulativeDistanceM = state.cumulativeDistanceM;
    this.movingTimeS = state.movingTimeS;
    this.elapsedTimeS = state.elapsedTimeS;
    this.elevationGainM = state.elevationGainM;
    this.elevationLossM = state.elevationLossM;
  }

  process(raw: RawPoint): FilteredPoint | null {
    if (!passesAccuracyFilter(raw, this.config.maxHorizontalAccuracyM)) {
      return null;
    }

    if (!passesOutlierFilter(this.prevAcceptedPoint, raw, this.config.maxSpeedJumpMs)) {
      return null;
    }

    let haversineDerivedSpeedMs: number | null = null;
    let segmentDistM = 0;

    if (this.prevAcceptedPoint) {
      const timeDeltaS = (raw.ts - this.prevAcceptedPoint.ts) / 1000;
      segmentDistM = haversineDistanceM(
        this.prevAcceptedPoint.lat, this.prevAcceptedPoint.lon,
        raw.lat, raw.lon,
      );
      if (timeDeltaS > 0) {
        haversineDerivedSpeedMs = segmentDistM / timeDeltaS;
      }

      this.elapsedTimeS += timeDeltaS;
    }

    const movingStatus = classifyMovingStatus(raw, haversineDerivedSpeedMs, this.config.movingSpeedThresholdMs);
    const isMoving = movingStatus === 'moving';

    const smoothedAltM = getSmoothedAltitudeM(raw);

    if (smoothedAltM !== null && this.prevSmoothedAltM !== null) {
      const { gainM, lossM } = computeElevationDelta(this.prevSmoothedAltM, smoothedAltM);
      this.elevationGainM += gainM;
      this.elevationLossM += lossM;
    }

    if (isMoving && this.prevAcceptedPoint) {
      this.cumulativeDistanceM += segmentDistM;
      const timeDeltaS = (raw.ts - this.prevAcceptedPoint.ts) / 1000;
      this.movingTimeS += timeDeltaS;
    }

    this.prevAcceptedPoint = raw;
    if (smoothedAltM !== null) this.prevSmoothedAltM = smoothedAltM;

    return {
      ...raw,
      isMoving,
      isFilteredOutlier: false,
    };
  }
}
