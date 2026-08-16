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

function StatTile({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, large && styles.statValueLarge]}>{value}</Text>
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
      <Text style={[styles.gpsText, { color }]}>
        GPS {label}{detail}
      </Text>
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
  } = useRecordingStore();

  const [activityType, setActivityType] = useState<
    'walking' | 'running' | 'cycling' | 'hiking'
  >('running');

  const livePace = computePaceSecPerUnit(liveDistanceM, liveMovingTimeS);

  const handleStart = useCallback(async () => {
    const activityId = generateId();
    const db = getDb();

    try {
      await insertActivity(db, {
        id: activityId,
        type: activityType,
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
  }, [activityType]);

  const handlePause = useCallback(async () => {
    try {
      await pauseRecording();
    } catch (err) {
      console.error('[RecordScreen] pauseRecording failed:', err);
    }
  }, []);

  const handleResume = useCallback(async () => {
    try {
      await resumeRecording();
    } catch (err) {
      console.error('[RecordScreen] resumeRecording failed:', err);
    }
  }, []);

  const handleStop = useCallback(async () => {
    Alert.alert(
      'Stop recording?',
      'This will save the activity.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop & Save',
          style: 'destructive',
          onPress: async () => {
            const id = activeActivityId;
            try {
              await stopRecording();
              if (id) {
                router.push(`/activity/${id}`);
              } else {
                router.push('/history');
              }
            } catch (err) {
              console.error('[RecordScreen] stopRecording failed:', err);
              router.push('/history');
            }
          },
        },
      ],
    );
  }, [activeActivityId, router]);

  if (status === 'idle') {
    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
        <View style={styles.idleContainer}>
          <Text style={styles.idleTitle}>What are you doing?</Text>

          <View style={styles.typeGrid}>
            {(
              [
                { type: 'running', emoji: '🏃', label: 'Run' },
                { type: 'walking', emoji: '🚶', label: 'Walk' },
                { type: 'cycling', emoji: '🚴', label: 'Ride' },
                { type: 'hiking', emoji: '🥾', label: 'Hike' },
              ] as const
            ).map(({ type, emoji, label }) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  activityType === type && styles.typeButtonActive,
                ]}
                onPress={() => setActivityType(type)}
                accessibilityRole="radio"
                accessibilityState={{ selected: activityType === type }}
                accessibilityLabel={label}
              >
                <Text style={styles.typeEmoji}>{emoji}</Text>
                <Text
                  style={[
                    styles.typeLabel,
                    activityType === type && styles.typeLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.liveContainer}
        bounces={false}
      >
        <GpsIndicator accuracyM={liveGpsAccuracyM} />

        <View style={[
          styles.statusBadge,
          status === 'paused' && styles.statusBadgePaused,
        ]}>
          <Text style={styles.statusBadgeText}>
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

const ACCENT = '#FF4D00';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  idleTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 32,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 40,
  },
  typeButton: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  typeButtonActive: {
    borderColor: ACCENT,
    backgroundColor: '#FFF5F0',
  },
  typeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeLabelActive: {
    color: ACCENT,
  },
  startButton: {
    backgroundColor: ACCENT,
    borderRadius: 32,
    paddingVertical: 18,
    paddingHorizontal: 64,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  statusBadgePaused: {
    backgroundColor: '#FEF9C3',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  primaryStat: {
    alignItems: 'center',
    marginBottom: 40,
  },
  primaryValue: {
    fontSize: 52,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -2,
  },
  primaryLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
    marginBottom: 48,
  },
  statTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 140,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  statValueLarge: {
    fontSize: 28,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  resumeButton: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  resumeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  stopButton: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
