import BackgroundGeolocation, {
  type Location,
} from 'react-native-background-geolocation';
import { IngestionPipeline } from './ingestion/pipeline';
import type { RawPoint } from './ingestion/types';
import { DEFAULT_INGESTION_CONFIG } from './ingestion/types';
import { getDb } from '../../db/client';
import { insertPoint } from '../../db/queries/points';
import {
  updateActivityLiveStats,
  finaliseActivity,
} from '../../db/queries/activities';
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
  });
}

export async function startRecording(activityId: string): Promise<void> {
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
  await BackgroundGeolocation.start();

  useRecordingStore.getState().setStatus('recording', activityId);
}

export async function pauseRecording(): Promise<void> {
  await BackgroundGeolocation.stop();
  useRecordingStore.getState().setStatus('paused', _activeActivityId);
}

export async function resumeRecording(): Promise<void> {
  await BackgroundGeolocation.start();
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

  _pipeline.reset();
  _pipeline = null;
  _activeActivityId = null;
  _totalRawPoints = 0;
  _acceptedPoints = 0;

  useRecordingStore.getState().reset();
}
