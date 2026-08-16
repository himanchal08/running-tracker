import { IngestionPipeline } from '../pipeline';
import type { RawPoint } from '../types';

function makePoint(overrides: Partial<RawPoint> & { lat: number; lon: number; ts: number }): RawPoint {
  return {
    altitudeM: 100,
    horizontalAccuracyM: 10,
    speedMs: 1.5,
    isBarometricAltitude: false,
    ...overrides,
  };
}

describe('IngestionPipeline — accuracy filter', () => {
  it('rejects points with accuracy worse than threshold', () => {
    const pipeline = new IngestionPipeline();
    const result = pipeline.process(makePoint({ lat: 0, lon: 0, ts: 0, horizontalAccuracyM: 50 }));
    expect(result).toBeNull();
  });

  it('rejects points with null accuracy', () => {
    const pipeline = new IngestionPipeline();
    const result = pipeline.process(makePoint({ lat: 0, lon: 0, ts: 0, horizontalAccuracyM: null }));
    expect(result).toBeNull();
  });

  it('accepts points at exactly the accuracy threshold', () => {
    const pipeline = new IngestionPipeline();
    const result = pipeline.process(makePoint({ lat: 0, lon: 0, ts: 0, horizontalAccuracyM: 25 }));
    expect(result).not.toBeNull();
  });
});

describe('IngestionPipeline — outlier rejection', () => {
  it('rejects a point that implies an impossible speed jump (>30 m/s)', () => {
    const pipeline = new IngestionPipeline();
    pipeline.process(makePoint({ lat: 51.5, lon: -0.1, ts: 0 }));
    const result = pipeline.process(makePoint({ lat: 51.51, lon: -0.1, ts: 1000 }));
    expect(result).toBeNull();
  });

  it('accepts a realistic walking speed (1.5 m/s)', () => {
    const pipeline = new IngestionPipeline();
    pipeline.process(makePoint({ lat: 51.5, lon: -0.1, ts: 0 }));
    const result = pipeline.process(makePoint({ lat: 51.50013, lon: -0.1, ts: 10_000 }));
    expect(result).not.toBeNull();
  });
});

describe('IngestionPipeline — moving time', () => {
  it('classifies slow-speed points as stationary (below 0.5 m/s threshold)', () => {
    const pipeline = new IngestionPipeline();
    const result = pipeline.process(makePoint({ lat: 0, lon: 0, ts: 0, speedMs: 0.1 }));
    expect(result?.isMoving).toBe(false);
  });

  it('classifies running-speed points as moving', () => {
    const pipeline = new IngestionPipeline();
    const result = pipeline.process(makePoint({ lat: 0, lon: 0, ts: 0, speedMs: 3.0 }));
    expect(result?.isMoving).toBe(true);
  });
});

describe('IngestionPipeline — cumulative distance', () => {
  it('computes distance within ±3% for a known straight-line route', () => {
    const pipeline = new IngestionPipeline();

    const STEPS = 10;
    const LAT_STEP = 0.0009;
    const BASE_LAT = 51.5;
    const LON = -0.1;
    const STEP_TIME_MS = 10_000;

    for (let i = 0; i < STEPS; i++) {
      pipeline.process(makePoint({
        lat: BASE_LAT + i * LAT_STEP,
        lon: LON,
        ts: i * STEP_TIME_MS,
        speedMs: 10,
      }));
    }

    const expectedM = 900;
    const tolerance = expectedM * 0.03;
    expect(pipeline.cumulativeDistanceM).toBeGreaterThan(expectedM - tolerance);
    expect(pipeline.cumulativeDistanceM).toBeLessThan(expectedM + tolerance);
  });

  it('does not add distance for stationary points', () => {
    const pipeline = new IngestionPipeline();
    pipeline.process(makePoint({ lat: 51.5, lon: -0.1, ts: 0, speedMs: 0.1 }));
    pipeline.process(makePoint({ lat: 51.5, lon: -0.1, ts: 10_000, speedMs: 0.1 }));
    expect(pipeline.cumulativeDistanceM).toBe(0);
  });
});

describe('IngestionPipeline — moving time accumulation', () => {
  it('accumulates moving time for moving points only', () => {
    const pipeline = new IngestionPipeline();
    pipeline.process(makePoint({ lat: 51.5, lon: -0.1, ts: 0, speedMs: 2.0 }));
    pipeline.process(makePoint({ lat: 51.5002, lon: -0.1, ts: 30_000, speedMs: 2.0 }));
    pipeline.process(makePoint({ lat: 51.5002, lon: -0.1, ts: 60_000, speedMs: 0.1 }));

    expect(pipeline.movingTimeS).toBeCloseTo(30, 0);
    expect(pipeline.elapsedTimeS).toBeCloseTo(60, 0);
  });
});

describe('IngestionPipeline — reset', () => {
  it('clears all state on reset', () => {
    const pipeline = new IngestionPipeline();
    pipeline.process(makePoint({ lat: 51.5, lon: -0.1, ts: 0, speedMs: 2.0 }));
    pipeline.process(makePoint({ lat: 51.5002, lon: -0.1, ts: 10_000, speedMs: 2.0 }));
    pipeline.reset();

    expect(pipeline.cumulativeDistanceM).toBe(0);
    expect(pipeline.movingTimeS).toBe(0);
    expect(pipeline.elevationGainM).toBe(0);
  });
});
