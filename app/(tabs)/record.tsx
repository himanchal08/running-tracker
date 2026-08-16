import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../../db/client';
import { insertActivity } from '../../db/queries/activities';
import {
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
} from '../../features/tracking/locationService';
import { useRecordingStore } from '../../store/recordingStore';
import {
  formatDistance,
  formatDuration,
  formatPace,
  computePaceSecPerUnit,
  gpsAccuracyLabel,
  gpsAccuracyColor,
} from '../../features/tracking/utils/formatters';
import { useEffect } from 'react';
import { LiveMap } from '../../components/LiveMap';

const GH = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  muted: '#8b949e',
  green: '#2ea043',
  greenBright: '#3fb950',
  greenFaint: '#0d4a1f',
  blue: '#58a6ff',
  yellow: '#d29922',
  red: '#f85149',
  redFaint: '#3d0000',
};

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function GpsIndicator({ accuracyM }: { accuracyM: number | null }) {
  const color = gpsAccuracyColor(accuracyM);
  const label = gpsAccuracyLabel(accuracyM);
  const detail = accuracyM != null ? ` ±${Math.round(accuracyM)}m` : '';

  return (
    <View style={styles.gpsRow}>
      <View style={[styles.gpsDot, { backgroundColor: color }]} />
      <Text style={[styles.gpsText, { color }]}>GPS {label}{detail}</Text>
    </View>
  );
}

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    status,
    activeActivityId,
    liveDistanceM,
    liveMovingTimeS,
    liveElapsedTimeS,
    liveElevationGainM,
    liveGpsAccuracyM,
    routePoints,
  } = useRecordingStore();

  const livePace = computePaceSecPerUnit(liveDistanceM, liveMovingTimeS);

  // Smooth ticker for elapsed time between GPS updates
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'recording') {
      interval = setInterval(() => {
        useRecordingStore.setState((s) => ({
          liveElapsedTimeS: s.liveElapsedTimeS + 1,
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleStart = useCallback(async () => {
    const activityId = generateId();
    const db = getDb();
    try {
      await insertActivity(db, {
        id: activityId,
        type: 'unknown',
        startedAt: new Date(),
        distanceM: 0,
        movingTimeS: 0,
        elapsedTimeS: 0,
        elevationGainM: 0,
        elevationLossM: 0,
        isManualOverride: false,
      });
      await startRecording(activityId);
    } catch (err) {
      Alert.alert('Error', 'Could not start recording. Check location permissions.');
      console.error('[RecordScreen] startRecording failed:', err);
    }
  }, []);

  const handlePause = useCallback(async () => {
    try { await pauseRecording(); } catch (err) {
      console.error('[RecordScreen] pauseRecording failed:', err);
    }
  }, []);

  const handleResume = useCallback(async () => {
    try { await resumeRecording(); } catch (err) {
      console.error('[RecordScreen] resumeRecording failed:', err);
    }
  }, []);

  const handleStop = useCallback(async () => {
    Alert.alert('Stop recording?', 'This will save the activity.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop & Save',
        style: 'destructive',
        onPress: async () => {
          const id = activeActivityId;
          try {
            await stopRecording();
            router.push(id ? `/activity/${id}` : '/history');
          } catch (err) {
            console.error('[RecordScreen] stopRecording failed:', err);
            router.push('/history');
          }
        },
      },
    ]);
  }, [activeActivityId, router]);

  if (status === 'idle') {
    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
        <View style={styles.idleContainer}>
          <Text style={styles.idleTitle}>Ready to move?</Text>
          <Text style={styles.idleSubtitle}>Just press Start. We'll automatically detect your activity.</Text>

          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel="Start recording"
          >
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.mapContainer}>
        <LiveMap routePoints={routePoints} />
      </View>
      <ScrollView contentContainerStyle={[styles.liveContainer, { paddingBottom: insets.bottom + 24 }]} bounces={false}>
        <GpsIndicator accuracyM={liveGpsAccuracyM} />

        <View style={[styles.statusBadge, status === 'paused' && styles.statusBadgePaused]}>
          <Text style={[styles.statusBadgeText, status === 'paused' && styles.statusBadgeTextPaused]}>
            {status === 'recording' ? '⬤  Recording' : '⏸  Paused'}
          </Text>
        </View>

        <View style={styles.primaryStat}>
          <Text style={styles.primaryValue}>{formatDistance(liveDistanceM)}</Text>
          <Text style={styles.primaryLabel}>Distance</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatTile label="Moving time" value={formatDuration(liveMovingTimeS)} />
          <StatTile label="Elapsed time" value={formatDuration(liveElapsedTimeS)} />
          <StatTile label="Avg pace" value={formatPace(livePace)} />
          <StatTile label="Elevation gain" value={`${Math.round(liveElevationGainM)} m`} />
        </View>

        <View style={styles.controls}>
          {status === 'recording' ? (
            <>
              <TouchableOpacity
                style={styles.pauseButton}
                onPress={handlePause}
                accessibilityRole="button"
                accessibilityLabel="Pause recording"
              >
                <Text style={styles.pauseButtonText}>⏸  Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStop}
                accessibilityRole="button"
                accessibilityLabel="Stop and save recording"
              >
                <Text style={styles.stopButtonText}>⏹  Stop</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={handleResume}
                accessibilityRole="button"
                accessibilityLabel="Resume recording"
              >
                <Text style={styles.resumeButtonText}>▶  Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStop}
                accessibilityRole="button"
                accessibilityLabel="Stop and save recording"
              >
                <Text style={styles.stopButtonText}>⏹  Stop & Save</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GH.bg,
  },
  mapContainer: {
    height: '45%',
    borderBottomWidth: 1,
    borderBottomColor: GH.border,
  },
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  idleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: GH.text,
    marginBottom: 8,
  },
  idleSubtitle: {
    fontSize: 14,
    color: GH.muted,
    marginBottom: 48,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: GH.green,
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 80,
    borderWidth: 1,
    borderColor: GH.greenBright,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  liveContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: GH.greenFaint,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: GH.green,
  },
  statusBadgePaused: {
    backgroundColor: '#2e1f00',
    borderColor: GH.yellow,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: GH.greenBright,
  },
  statusBadgeTextPaused: {
    color: GH.yellow,
  },
  primaryStat: {
    alignItems: 'center',
    marginBottom: 40,
  },
  primaryValue: {
    fontSize: 56,
    fontWeight: '700',
    color: GH.text,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  primaryLabel: {
    fontSize: 13,
    color: GH.muted,
    fontWeight: '500',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
    marginBottom: 48,
  },
  statTile: {
    backgroundColor: GH.surface,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 140,
    flex: 1,
    borderWidth: 1,
    borderColor: GH.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: GH.text,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    color: GH.muted,
    fontWeight: '500',
    marginTop: 3,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  pauseButton: {
    flex: 1,
    backgroundColor: GH.surface,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GH.border,
  },
  pauseButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: GH.text,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: GH.greenFaint,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GH.green,
  },
  resumeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: GH.greenBright,
  },
  stopButton: {
    flex: 1,
    backgroundColor: GH.red,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  stopButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
