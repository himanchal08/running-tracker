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
import type { Activity } from '../../db/schema';
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

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={[styles.statRowValue, accent && styles.statRowValueAccent]}>
        {value}
      </Text>
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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    try {
      const db = getDb();
      const row = await getActivity(db, id);
      if (!row) { setNotFound(true); } else { setActivity(row); }
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
      'The activity will be kept in the trash for 30 days before permanent deletion.',
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

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color="#FF4D00" />
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
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>
          {ACTIVITY_TYPE_EMOJI[activity.type] ?? '📍'}
        </Text>
        <View>
          <Text style={styles.headerType}>
            {ACTIVITY_TYPE_LABELS[activity.type] ?? 'Activity'}
          </Text>
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

      <SectionCard title="Performance">
        <StatRow label="Max speed" value={formatSpeed(activity.maxSpeedMs)} />
        <StatRow label="Elapsed time" value={formatDuration(activity.elapsedTimeS)} />
        <StatRow
          label="Moving time"
          value={formatDuration(activity.movingTimeS)}
        />
        {activity.elapsedTimeS > 0 && (
          <StatRow
            label="Efficiency"
            value={`${Math.round((activity.movingTimeS / activity.elapsedTimeS) * 100)}%`}
          />
        )}
      </SectionCard>

      <SectionCard title="Elevation">
        <StatRow
          label="Gain"
          value={`+${Math.round(activity.elevationGainM)} m`}
          accent
        />
        <StatRow
          label="Loss"
          value={`-${Math.round(activity.elevationLossM)} m`}
        />
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

const ACCENT = '#FF4D00';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerEmoji: {
    fontSize: 36,
  },
  headerType: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metricTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 3,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  statRowLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statRowValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  statRowValueAccent: {
    color: ACCENT,
  },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
});
