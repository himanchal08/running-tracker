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

function getHeatmapLevel(distanceM: number): number {
  if (distanceM === 0) return 0;
  if (distanceM < 2000) return 1;
  if (distanceM < 5000) return 2;
  if (distanceM < 10000) return 3;
  return 4;
}

function buildHeatmapData(activities: Activity[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of activities) {
    const key = a.startedAt.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + a.distanceM);
  }
  return map;
}

function getHeatmapCells(): string[] {
  const cells: string[] = [];
  const today = new Date();
  for (let i = 51 * 7 + today.getDay(); i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    cells.push(d.toISOString().slice(0, 10));
  }
  return cells;
}

function ActivityHeatmap({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => buildHeatmapData(activities), [activities]);
  const cells = useMemo(() => getHeatmapCells(), []);

  const totalActivities = activities.length;
  const totalDistance = activities.reduce((acc, a) => acc + a.distanceM, 0);

  return (
    <View style={heatStyles.container}>
      <View style={heatStyles.header}>
        <Text style={heatStyles.title}>Activity</Text>
        <Text style={heatStyles.subtitle}>
          {totalActivities} activities · {formatDistance(totalDistance)} total
        </Text>
      </View>
      <View style={heatStyles.grid}>
        {cells.map((date) => {
          const dist = data.get(date) ?? 0;
          const level = getHeatmapLevel(dist);
          return (
            <View
              key={date}
              style={[heatStyles.cell, { backgroundColor: HEATMAP_LEVELS[level] }]}
            />
          );
        })}
      </View>
      <View style={heatStyles.legend}>
        <Text style={heatStyles.legendLabel}>Less</Text>
        {HEATMAP_LEVELS.map((color, i) => (
          <View key={i} style={[heatStyles.legendCell, { backgroundColor: color }]} />
        ))}
        <Text style={heatStyles.legendLabel}>More</Text>
      </View>
    </View>
  );
}

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
      ListHeaderComponent={<ActivityHeatmap activities={activities} />}
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

const heatStyles = StyleSheet.create({
  container: {
    backgroundColor: GH.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GH.border,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: GH.text,
  },
  subtitle: {
    fontSize: 11,
    color: GH.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  cell: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  legendCell: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 10,
    color: GH.muted,
    marginHorizontal: 2,
  },
});

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
});
