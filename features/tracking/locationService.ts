import BackgroundGeolocation, {
  type Location,
  type MotionActivityEvent,
} from 'react-native-background-geolocation';
import { IngestionPipeline } from './ingestion/pipeline';
import type { RawPoint } from './ingestion/types';
import { DEFAULT_INGESTION_CONFIG } from './ingestion/types';
import { getDb } from '../../db/client';
import { insertPoint, getPointsForActivity } from '../../db/queries/points';
import {
  updateActivityLiveStats,
  finaliseActivity,
  autoUpdateActivityType,
} from '../../db/queries/activities';
import {
  getAllRouteCandidates,
  upsertRoute,
  saveRouteAttempt,
  listAttemptsForRoute,
} from '../../db/queries/routes';
import {
  extractEndpoints,
  buildCanonicalPolyline,
  matchRoute,
} from '../routes/routeMatcher';
import { getBestAttempt } from '../routes/routeAnalytics';
import { useRecordingStore } from '../../store/recordingStore';

let _pipeline: IngestionPipeline | null = null;
let _activeActivityId: string | null = null;
let _totalRawPoints = 0;
let _acceptedPoints = 0;

function locationToRawPoint(loc: Location): RawPoint {
  return {
    lat: loc.coords.latitude,
    lon: loc.coords.longitude,
    altitudeM: loc.coords.altitude ?? null,
    horizontalAccuracyM: loc.coords.accuracy ?? null,
    speedMs: loc.coords.speed != null && loc.coords.speed >= 0
      ? loc.coords.speed
      : null,
    ts: new Date(loc.timestamp).getTime(),
    isBarometricAltitude: false,
  };
}

function computeGpsQualityScore(): number {
  if (_totalRawPoints === 0) return 0;
  return _acceptedPoints / _totalRawPoints;
}

async function onLocation(location: Location): Promise<void> {
  if (!_pipeline || !_activeActivityId) return;

  _totalRawPoints++;
  const raw = locationToRawPoint(location);
  const filtered = _pipeline.process(raw);

  if (filtered === null) {
    useRecordingStore.getState().setLiveGpsAccuracy(raw.horizontalAccuracyM);
    return;
  }

  _acceptedPoints++;

  const db = getDb();

  await insertPoint(db, {
    activityId: _activeActivityId,
    ts: new Date(filtered.ts),
    lat: filtered.lat,
    lon: filtered.lon,
    altitudeM: filtered.altitudeM,
    horizontalAccuracyM: filtered.horizontalAccuracyM,
    speedMs: filtered.speedMs,
    isFilteredOutlier: false,
    isMoving: filtered.isMoving,
  });

  const gpsQualityScore = computeGpsQualityScore();
  await updateActivityLiveStats(db, _activeActivityId, {
    distanceM: _pipeline.cumulativeDistanceM,
    movingTimeS: Math.round(_pipeline.movingTimeS),
    elapsedTimeS: Math.round(_pipeline.elapsedTimeS),
    elevationGainM: _pipeline.elevationGainM,
    elevationLossM: _pipeline.elevationLossM,
    maxSpeedMs: filtered.speedMs != null
      ? Math.max(filtered.speedMs, 0)
      : undefined,
    gpsQualityScore,
  });

  useRecordingStore.getState().setLiveStats({
    liveDistanceM: _pipeline.cumulativeDistanceM,
    liveMovingTimeS: _pipeline.movingTimeS,
    liveElapsedTimeS: _pipeline.elapsedTimeS,
    liveElevationGainM: _pipeline.elevationGainM,
    liveGpsAccuracyM: filtered.horizontalAccuracyM,
    routePoints: [...useRecordingStore.getState().routePoints, [filtered.lon, filtered.lat]],
  });
}

async function onActivityChange(event: MotionActivityEvent): Promise<void> {
  if (!_activeActivityId) return;

  const { activity } = event;
  let type: 'walking' | 'running' | 'cycling' | 'hiking' | 'unknown' = 'unknown';

  if (activity === 'running') type = 'running';
  else if (activity === 'walking' || activity === 'on_foot') type = 'walking';
  else if (activity === 'on_bicycle') type = 'cycling';

  if (type !== 'unknown') {
    try {
      const db = getDb();
      await autoUpdateActivityType(db, _activeActivityId, type);
    } catch (err) {
      console.error('[locationService] autoUpdateActivityType failed:', err);
    }
  }
}

let _isStarting = false;

export async function startRecording(activityId: string): Promise<void> {
  if (_isStarting) return;
  _isStarting = true;
  try {
    _pipeline = new IngestionPipeline(DEFAULT_INGESTION_CONFIG);
    _activeActivityId = activityId;
    _totalRawPoints = 0;
    _acceptedPoints = 0;

    await BackgroundGeolocation.ready({
    desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
    distanceFilter: 5,
    stopOnTerminate: false,
    startOnBoot: false,
    preventSuspend: true,
    notification: {
      title: 'Movement Tracker',
      text: 'Recording your activity…',
    },
    debug: false,
    logLevel: BackgroundGeolocation.LOG_LEVEL_OFF,
  });

  BackgroundGeolocation.onLocation(onLocation);
  BackgroundGeolocation.onActivityChange(onActivityChange);
    const state = await BackgroundGeolocation.getState();
    if (!state.enabled) {
      await BackgroundGeolocation.start();
    }

    useRecordingStore.getState().setStatus('recording', activityId);
  } finally {
    _isStarting = false;
  }
}

export async function pauseRecording(): Promise<void> {
  await BackgroundGeolocation.stop();
  useRecordingStore.getState().setStatus('paused', _activeActivityId);
}

export async function resumeRecording(): Promise<void> {
  const state = await BackgroundGeolocation.getState();
  if (!state.enabled) {
    await BackgroundGeolocation.start();
  }
  useRecordingStore.getState().setStatus('recording', _activeActivityId);
}

export async function stopRecording(): Promise<void> {
  if (!_pipeline || !_activeActivityId) return;

  await BackgroundGeolocation.stop();
  BackgroundGeolocation.removeListeners();

  const db = getDb();
  await finaliseActivity(
    db,
    _activeActivityId,
    new Date(),
    {
      distanceM: _pipeline.cumulativeDistanceM,
      movingTimeS: Math.round(_pipeline.movingTimeS),
      elapsedTimeS: Math.round(_pipeline.elapsedTimeS),
      elevationGainM: _pipeline.elevationGainM,
      elevationLossM: _pipeline.elevationLossM,
      maxSpeedMs: null,
      gpsQualityScore: computeGpsQualityScore(),
    },
  );

  const savedActivityId = _activeActivityId;

  _pipeline.reset();
  _pipeline = null;
  _activeActivityId = null;
  _totalRawPoints = 0;
  _acceptedPoints = 0;

  useRecordingStore.getState().reset();

  if (savedActivityId) {
    try {
      await runRouteMatching(db, savedActivityId);
    } catch (err) {
      console.error('[locationService] runRouteMatching failed:', err);
    }
  }
}

async function runRouteMatching(db: ReturnType<typeof getDb>, activityId: string): Promise<void> {
  const pts = await getPointsForActivity(db, activityId);
  if (pts.length < 10) return;

  const endpoints = extractEndpoints(pts);
  if (!endpoints) return;

  const candidates = await getAllRouteCandidates(db);
  const matchedRouteId = matchRoute(endpoints, candidates);

  if (matchedRouteId) {
    const existingAttempts = await listAttemptsForRoute(db, matchedRouteId);
    const best = getBestAttempt(existingAttempts);
    const activity = await import('../../db/queries/activities').then((m) => m.getActivity(db, activityId));
    let deltaVsBestS: number | null = null;
    if (best && activity) {
      deltaVsBestS = activity.movingTimeS - best.activity.movingTimeS;
    }
    await upsertRoute(db, {
      id: matchedRouteId,
      canonicalPolyline: candidates.find((c) => c.id === matchedRouteId)!.canonicalPolyline,
      firstSeenAt: new Date(),
    });
    await saveRouteAttempt(db, { routeId: matchedRouteId, activityId, deltaVsBestS });
  } else {
    const activity = await import('../../db/queries/activities').then((m) => m.getActivity(db, activityId));
    if (!activity || activity.distanceM < 500) return;

    const routeId = activityId;
    const polyline = buildCanonicalPolyline(pts);
    await upsertRoute(db, { id: routeId, canonicalPolyline: polyline, firstSeenAt: new Date() });
    await saveRouteAttempt(db, { routeId, activityId, deltaVsBestS: null });
  }
}
