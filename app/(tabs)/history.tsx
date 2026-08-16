import { useEffect, useState, useCallback, useMemo } from 'react';
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

const GH = {
  bg: '#0d1117',
  surface: '#161b22',
  surfaceHover: '#1c2128',
  border: '#30363d',
  text: '#c9d1d9',
  muted: '#8b949e',
  green: '#2ea043',
  greenBright: '#3fb950',
  greenFaint: '#0d4a1f',
  blue: '#58a6ff',
  yellow: '#d29922',
  yellowFaint: '#2e1f00',
};

const HEATMAP_LEVELS = [
  '#161b22',
  '#0e4429',
  '#006d32',
  '#26a641',
  '#39d353',
];

import { ActivityHeatmap } from '../../components/ActivityHeatmap';

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
          <Text style={styles.cardEmoji}>{ACTIVITY_TYPE_EMOJI[activity.type] ?? '📍'}</Text>
          <Text style={styles.cardType}>{ACTIVITY_TYPE_LABELS[activity.type] ?? 'Activity'}</Text>
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
      <Text style={styles.emptySubtitle}>Tap the Record tab to start your first activity.</Text>
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

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActivities();
  }, [loadActivities]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GH.greenBright} />
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
      ListHeaderComponent={
        <>
          <ActivityHeatmap activities={activities} />
          <TouchableOpacity
            style={styles.routesEntryBtn}
            onPress={() => router.push('/routes' as any)}
            accessibilityRole="button"
            accessibilityLabel="View all my recognized routes"
          >
            <Text style={styles.routesEntryText}>🗺  My Routes</Text>
            <Text style={styles.routesEntryChevron}>›</Text>
          </TouchableOpacity>
        </>
      }
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
          tintColor={GH.greenBright}
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
    backgroundColor: GH.bg,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: GH.bg,
    flexGrow: 1,
  },
  listContentEmpty: {
    flex: 1,
  },
  card: {
    backgroundColor: GH.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GH.border,
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
    color: GH.text,
  },
  cardDate: {
    fontSize: 12,
    color: GH.muted,
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
    color: GH.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: GH.muted,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: GH.border,
  },
  gpsWarning: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: GH.border,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  gpsWarningText: {
    fontSize: 12,
    color: GH.yellow,
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
    color: GH.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: GH.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  routesEntryBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: GH.surface,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: GH.border,
  },
  routesEntryText: {
    fontSize: 15,
    fontWeight: '700',
    color: GH.blue,
  },
  routesEntryChevron: {
    fontSize: 20,
    color: GH.muted,
  },
});
