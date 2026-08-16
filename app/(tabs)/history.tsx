import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../../db/client';
import { listActivities } from '../../db/queries/activities';
import type { Activity } from '../../db/schema';
import {
  formatDistance,
  formatDuration,
  computePaceSecPerUnit,
  formatPace,
  formatActivityDate,
  ACTIVITY_TYPE_EMOJI,
  ACTIVITY_TYPE_LABELS,
} from '../../features/tracking/utils/formatters';

function ActivityCard({ activity, onPress }: { activity: Activity; onPress: () => void }) {
  const pace = computePaceSecPerUnit(activity.distanceM, activity.movingTimeS);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${ACTIVITY_TYPE_LABELS[activity.type] ?? 'Activity'} on ${formatActivityDate(activity.startedAt)}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTypeRow}>
          <Text style={styles.cardEmoji}>
            {ACTIVITY_TYPE_EMOJI[activity.type] ?? '📍'}
          </Text>
          <Text style={styles.cardType}>
            {ACTIVITY_TYPE_LABELS[activity.type] ?? 'Activity'}
          </Text>
        </View>
        <Text style={styles.cardDate}>{formatActivityDate(activity.startedAt)}</Text>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDistance(activity.distanceM)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDuration(activity.movingTimeS)}</Text>
          <Text style={styles.statLabel}>Moving time</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatPace(pace)}</Text>
          <Text style={styles.statLabel}>Avg pace</Text>
        </View>
      </View>

      {activity.gpsQualityScore != null && activity.gpsQualityScore < 0.7 && (
        <View style={styles.gpsWarning}>
          <Text style={styles.gpsWarningText}>
            ⚠ Low GPS quality ({Math.round(activity.gpsQualityScore * 100)}%)
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function EmptyHistory() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🏃</Text>
      <Text style={styles.emptyTitle}>No activities yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the Record tab to start your first activity.
      </Text>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivities = useCallback(async () => {
    try {
      const db = getDb();
      const rows = await listActivities(db);
      setActivities(rows);
    } catch (err) {
      console.error('[HistoryScreen] Failed to load activities:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActivities();
  }, [loadActivities]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4D00" />
      </View>
    );
  }

  return (
    <FlatList
      data={activities}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ActivityCard
          activity={item}
          onPress={() => router.push(`/activity/${item.id}`)}
        />
      )}
      ListEmptyComponent={<EmptyHistory />}
      contentContainerStyle={[
        styles.listContent,
        activities.length === 0 && styles.listContentEmpty,
        { paddingBottom: insets.bottom + 16 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FF4D00"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#F9FAFB',
    flexGrow: 1,
  },
  listContentEmpty: {
    flex: 1,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardEmoji: {
    fontSize: 18,
  },
  cardType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardDate: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F3F4F6',
  },
  gpsWarning: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  gpsWarningText: {
    fontSize: 12,
    color: '#92400E',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
