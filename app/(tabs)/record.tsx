import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display';
import { M, RADIUS } from '../../constants/theme';
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

// Tokens from constants/theme.ts (M)

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

function StatTile({ label, value, fontsLoaded }: { label: string; value: string; fontsLoaded: boolean }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function GpsIndicator({ accuracyM }: { accuracyM: number | null }) {
  const color = gpsAccuracyColor(accuracyM);
  const label = gpsAccuracyLabel(accuracyM);
  const detail = accuracyM != null ? ` ±${Math.round(accuracyM)}m` : '';

  return (
    <View style={styles.gpsPill}>
      <View style={[styles.gpsDot, { backgroundColor: color }]} />
      <Text style={styles.gpsText}>GPS {label}{detail}</Text>
    </View>
  );
}

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({ PlayfairDisplay_700Bold, PlayfairDisplay_400Regular });

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
      <View style={styles.screen}>
        <View style={styles.ambientGlow} pointerEvents="none" />
        <View style={[styles.idleContainer, { paddingBottom: insets.bottom + 80 }]}>
          <Text style={styles.wordmark}>MOVEMENT</Text>
          <View style={styles.contextChip}>
            <Text style={styles.contextChipText}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.headlineBlock}>
            <Text style={[styles.idleTitle, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {"Let's\nrun."}
            </Text>
            <View style={styles.subtextAccent}>
              <Text style={styles.idleSubtitle}>
                {"Your pace. Your route.\nYour data — always."}
              </Text>
            </View>
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

  const distanceParts = formatDistance(liveDistanceM).split(' ');
  const distanceNum = distanceParts[0];
  const distanceUnit = distanceParts[1] ?? 'km';

  return (
    <View style={styles.screen}>
      <View style={styles.mapContainer}>
        <LiveMap routePoints={routePoints} liveMode={true} />
        <View style={styles.mapFade} pointerEvents="none" />
      </View>
      <ScrollView
        contentContainerStyle={[styles.liveContainer, { paddingBottom: insets.bottom + 100 }]}
        bounces={false}
      >
        <View style={styles.statusRow}>
          <GpsIndicator accuracyM={liveGpsAccuracyM} />
          <View style={[styles.recBadge, status === 'paused' && styles.recBadgePaused]}>
            <View style={[styles.recDot, status === 'paused' && { backgroundColor: M.amber }]} />
            <Text style={[styles.recText, status === 'paused' && { color: M.amber }]}>
              {status === 'recording' ? 'REC' : 'PAUSED'}
            </Text>
          </View>
        </View>

        <View style={styles.primaryStat}>
          <Text style={[styles.primaryValue, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {distanceNum}
          </Text>
          <Text style={styles.primaryUnit}>{distanceUnit.toUpperCase()}</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatTile label="MOVING TIME" value={formatDuration(liveMovingTimeS)} fontsLoaded={fontsLoaded} />
          <StatTile label="ELAPSED" value={formatDuration(liveElapsedTimeS)} fontsLoaded={fontsLoaded} />
          <StatTile label="AVG PACE" value={formatPace(livePace)} fontsLoaded={fontsLoaded} />
          <StatTile label="ELEV GAIN" value={`${Math.round(liveElevationGainM)}m`} fontsLoaded={fontsLoaded} />
        </View>

        <View style={styles.controls}>
          {status === 'recording' ? (
            <>
              <TouchableOpacity style={styles.pauseButton} onPress={handlePause}
                accessibilityRole="button" accessibilityLabel="Pause recording">
                <Text style={styles.pauseButtonText}>PAUSE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopButton} onPress={handleStop}
                accessibilityRole="button" accessibilityLabel="Stop and save recording">
                <Text style={styles.stopButtonText}>STOP</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.resumeButton} onPress={handleResume}
                accessibilityRole="button" accessibilityLabel="Resume recording">
                <Text style={styles.resumeButtonText}>RESUME</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopButton} onPress={handleStop}
                accessibilityRole="button" accessibilityLabel="Stop and save recording">
                <Text style={styles.stopButtonText}>STOP & SAVE</Text>
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
    backgroundColor: M.bg,
  },

  // ── Idle state ─────────────────────────────────────────────────
  ambientGlow: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(13,22,60,0.6)',
  },
  idleContainer: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 11,
    fontWeight: '600',
    color: M.textSecondary,
    letterSpacing: 0.15,
    marginBottom: 40,
  },
  contextChip: {
    backgroundColor: 'rgba(28,26,37,0.5)',
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  contextChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: M.textOnSurface,
    letterSpacing: 0.025,
  },
  headlineBlock: {
    marginBottom: 48,
    gap: 20,
  },
  idleTitle: {
    fontSize: 52,
    fontWeight: '700',
    color: M.textPrimary,
    letterSpacing: -1.5,
    lineHeight: 60,
  },
  subtextAccent: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(187,255,230,0.2)',
    paddingLeft: 16,
  },
  idleSubtitle: {
    fontSize: 18,
    color: M.textSecondary,
    lineHeight: 28,
  },
  startButton: {
    backgroundColor: M.teal,
    borderRadius: RADIUS.pill,
    paddingVertical: 20,
    paddingHorizontal: 48,
    alignSelf: 'flex-start',
    shadowColor: M.teal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  startButtonText: {
    color: M.bg,
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Active / recording state ────────────────────────────────────
  mapContainer: {
    height: '50%',
  },
  mapFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
  },
  liveContainer: {
    flexGrow: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(53,51,63,0.5)',
    borderWidth: 1,
    borderColor: M.borderFaint,
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsText: {
    fontSize: 12,
    fontWeight: '600',
    color: M.textPrimary,
    letterSpacing: 0.1,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recBadgePaused: {},
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: M.danger,
  },
  recText: {
    fontSize: 12,
    fontWeight: '600',
    color: M.danger,
    letterSpacing: 0.1,
  },
  primaryStat: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 32,
  },
  primaryValue: {
    fontSize: 72,
    fontWeight: '700',
    color: M.textPrimary,
    letterSpacing: -2,
    lineHeight: 72,
    fontVariant: ['tabular-nums'],
  },
  primaryUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: M.textSecondary,
    letterSpacing: 0.1,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    marginBottom: 32,
  },
  statTile: {
    backgroundColor: M.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    minWidth: '45%',
    flex: 1,
    borderWidth: 1,
    borderColor: M.borderFaint,
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: M.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    color: M.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  pauseButton: {
    flex: 1,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pauseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: M.textPrimary,
    letterSpacing: 0.1,
  },
  resumeButton: {
    flex: 1,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M.tealFaint,
    borderWidth: 1,
    borderColor: M.tealBorder,
  },
  resumeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: M.teal,
    letterSpacing: 0.1,
  },
  stopButton: {
    flex: 1,
    backgroundColor: M.danger,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: M.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 6,
  },
  stopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: M.dangerDark,
    letterSpacing: 0.1,
  },
});
