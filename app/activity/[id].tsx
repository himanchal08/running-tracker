import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../../db/client';
import { getActivity, trashActivity } from '../../db/queries/activities';
import { getPointsForActivity } from '../../db/queries/points';
import type { Activity } from '../../db/schema';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LiveMap } from '../../components/LiveMap';
import { useRef } from 'react';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  computePaceSecPerUnit,
  formatActivityDate,
  ACTIVITY_TYPE_EMOJI,
  ACTIVITY_TYPE_LABELS,
} from '../../features/tracking/utils/formatters';

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
  red: '#f85149',
  redSurface: '#3d0000',
  redBorder: '#6e1313',
};

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={[styles.statRowValue, accent && styles.statRowValueAccent]}>{value}</Text>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const viewShotRef = useRef<any>(null);

  const loadActivity = useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    try {
      const db = getDb();
      const row = await getActivity(db, id);
      if (!row) { setNotFound(true); } else { 
        setActivity(row); 
        const pts = await getPointsForActivity(db, id);
        setRoutePoints(pts.map(p => [p.lon, p.lat]));
      }
    } catch (err) {
      console.error('[ActivityDetail] load failed:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Move to trash?',
      'The activity will be kept for 30 days before permanent deletion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getDb();
              await trashActivity(db, id!);
              router.back();
            } catch (err) {
              console.error('[ActivityDetail] trash failed:', err);
              Alert.alert('Error', 'Could not delete the activity.');
            }
          },
        },
      ],
    );
  }, [id, router]);

  const handleShare = useCallback(async () => {
    if (viewShotRef.current && viewShotRef.current.capture) {
      try {
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Sharing not available', 'Cannot share from this device.');
        }
      } catch (err) {
        console.error('[ActivityDetail] share failed:', err);
        Alert.alert('Error', 'Could not share image.');
      }
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={GH.greenBright} />
      </View>
    );
  }

  if (notFound || !activity) {
    return (
      <View style={styles.centred}>
        <Text style={styles.notFoundText}>Activity not found.</Text>
      </View>
    );
  }

  const pace = computePaceSecPerUnit(activity.distanceM, activity.movingTimeS);
  const startTime = activity.startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = activity.endedAt
    ? activity.endedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Share ↗</Text>
        </TouchableOpacity>
      </View>

      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
        <View style={styles.shareableContainer}>
          <View style={styles.mapContainer}>
            <LiveMap routePoints={routePoints} />
          </View>

          <View style={styles.header}>
        <Text style={styles.headerEmoji}>{ACTIVITY_TYPE_EMOJI[activity.type] ?? '📍'}</Text>
        <View>
          <Text style={styles.headerType}>{ACTIVITY_TYPE_LABELS[activity.type] ?? 'Activity'}</Text>
          <Text style={styles.headerDate}>
            {formatActivityDate(activity.startedAt)} · {startTime}–{endTime}
          </Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricTile}>
          <Text style={styles.metricValue}>{formatDistance(activity.distanceM)}</Text>
          <Text style={styles.metricLabel}>Distance</Text>
        </View>
        <View style={styles.metricTile}>
          <Text style={styles.metricValue}>{formatDuration(activity.movingTimeS)}</Text>
          <Text style={styles.metricLabel}>Moving time</Text>
        </View>
        <View style={styles.metricTile}>
          <Text style={styles.metricValue}>{formatPace(pace)}</Text>
          <Text style={styles.metricLabel}>Avg pace</Text>
        </View>
        <View style={styles.metricTile}>
          <Text style={styles.metricValue}>{formatSpeed(activity.avgSpeedMs)}</Text>
          <Text style={styles.metricLabel}>Avg speed</Text>
        </View>
      </View>
      </View>
      </ViewShot>

      <SectionCard title="Performance">
        <StatRow label="Max speed" value={formatSpeed(activity.maxSpeedMs)} />
        <StatRow label="Elapsed time" value={formatDuration(activity.elapsedTimeS)} />
        <StatRow label="Moving time" value={formatDuration(activity.movingTimeS)} />
        {activity.elapsedTimeS > 0 && (
          <StatRow
            label="Efficiency"
            value={`${Math.round((activity.movingTimeS / activity.elapsedTimeS) * 100)}%`}
          />
        )}
      </SectionCard>

      <SectionCard title="Elevation">
        <StatRow label="Gain" value={`+${Math.round(activity.elevationGainM)} m`} accent />
        <StatRow label="Loss" value={`-${Math.round(activity.elevationLossM)} m`} />
      </SectionCard>

      <SectionCard title="Data quality">
        {activity.gpsQualityScore != null ? (
          <StatRow
            label="GPS quality"
            value={`${Math.round(activity.gpsQualityScore * 100)}%`}
            accent={activity.gpsQualityScore >= 0.85}
          />
        ) : (
          <StatRow label="GPS quality" value="—" />
        )}
        {activity.isManualOverride && (
          <StatRow label="Activity type" value="Manually set" />
        )}
      </SectionCard>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Move this activity to trash"
      >
        <Text style={styles.deleteButtonText}>Move to Trash</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GH.bg,
  },
  content: {
    padding: 16,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GH.bg,
  },
  notFoundText: {
    fontSize: 16,
    color: GH.muted,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  shareButton: {
    backgroundColor: GH.greenFaint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GH.green,
  },
  shareButtonText: {
    color: GH.greenBright,
    fontWeight: '600',
    fontSize: 14,
  },
  shareableContainer: {
    backgroundColor: GH.bg, // For the screenshot background
    paddingBottom: 10,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GH.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: GH.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GH.border,
  },
  headerEmoji: {
    fontSize: 36,
  },
  headerType: {
    fontSize: 20,
    fontWeight: '700',
    color: GH.text,
  },
  headerDate: {
    fontSize: 13,
    color: GH.muted,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  metricTile: {
    backgroundColor: GH.surface,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: GH.border,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: GH.text,
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontSize: 11,
    color: GH.muted,
    fontWeight: '500',
    marginTop: 3,
  },
  sectionCard: {
    backgroundColor: GH.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GH.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: GH.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GH.border,
  },
  statRowLabel: {
    fontSize: 14,
    color: GH.muted,
    fontWeight: '500',
  },
  statRowValue: {
    fontSize: 14,
    color: GH.text,
    fontWeight: '600',
  },
  statRowValueAccent: {
    color: GH.greenBright,
  },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GH.redBorder,
    alignItems: 'center',
    backgroundColor: GH.redSurface,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: GH.red,
  },
});
