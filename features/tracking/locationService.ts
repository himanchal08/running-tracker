import * as Location from 'expo-location';
import { IngestionPipeline } from './ingestion/pipeline';
import type { RawPoint } from './ingestion/types';
import { DEFAULT_INGESTION_CONFIG } from './ingestion/types';
import { getDb } from '../../db/client';
import { insertPoint, getPointsForActivity } from '../../db/queries/points';
import {
  updateActivityLiveStats,
  finaliseActivity,
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

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

let _pipeline: IngestionPipeline | null = null;
let _activeActivityId: string | null = null;
let _totalRawPoints = 0;
let _acceptedPoints = 0;

function locationToRawPoint(loc: Location.LocationObject): RawPoint {
  return {
    lat: loc.coords.latitude,
    lon: loc.coords.longitude,
    altitudeM: loc.coords.altitude ?? null,
    horizontalAccuracyM: loc.coords.accuracy ?? null,
    speedMs: loc.coords.speed != null && loc.coords.speed >= 0
      ? loc.coords.speed
      : null,
    ts: loc.timestamp,
    isBarometricAltitude: false,
  };
}

function computeGpsQualityScore(): number {
  if (_totalRawPoints === 0) return 0;
  return _acceptedPoints / _totalRawPoints;
}

export async function handleLocationUpdate(location: Location.LocationObject): Promise<void> {
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

let _isStarting = false;

export async function startRecording(activityId: string): Promise<void> {
  if (_isStarting) return;
  _isStarting = true;
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      alert('Permission to access location was denied');
      return;
    }
    
    // We request background so the user can be prompted.
    try {
      await Location.requestBackgroundPermissionsAsync();
    } catch (err) {
      console.log('Background permission request skipped/denied:', err);
    }

    _pipeline = new IngestionPipeline(DEFAULT_INGESTION_CONFIG);
    _activeActivityId = activityId;
    _totalRawPoints = 0;
    _acceptedPoints = 0;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 5,
      deferredUpdatesInterval: 1000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Movement Tracker',
        notificationBody: 'Recording your activity...',
        notificationColor: '#3fb950',
      },
    });

    useRecordingStore.getState().setStatus('recording', activityId);
  } finally {
    _isStarting = false;
  }
}

export async function pauseRecording(): Promise<void> {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  useRecordingStore.getState().setStatus('paused', _activeActivityId);
}

export async function resumeRecording(): Promise<void> {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!hasStarted) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 5,
      deferredUpdatesInterval: 1000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Movement Tracker',
        notificationBody: 'Recording your activity...',
        notificationColor: '#3fb950',
      },
    });
  }
  useRecordingStore.getState().setStatus('recording', _activeActivityId);
}

export async function stopRecording(): Promise<void> {
  if (!_pipeline || !_activeActivityId) return;

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }

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
