import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../../db/client';
import { listActivities, deleteActivities } from '../../db/queries/activities';
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
  red: '#f85149',
};

const HEATMAP_LEVELS = [
  '#161b22',
  '#0e4429',
  '#006d32',
  '#26a641',
  '#39d353',
];

import { ActivityHeatmap } from '../../components/ActivityHeatmap';

function ActivityCard({ 
  activity, 
  onPress,
  onLongPress,
  selectionMode,
  isSelected,
}: { 
  activity: Activity; 
  onPress: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
}) {
  const pace = computePaceSecPerUnit(activity.distanceM, activity.movingTimeS);

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${ACTIVITY_TYPE_LABELS[activity.type] ?? 'Activity'} on ${formatActivityDate(activity.startedAt)}`}
    >
      {selectionMode && (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
        </View>
      )}
      <View style={styles.cardContentWrapper}>
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

      </View>
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
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Delete Activities',
      `Are you sure you want to delete ${selectedIds.size} activities?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getDb();
              await deleteActivities(db, Array.from(selectedIds));
              setSelectionMode(false);
              setSelectedIds(new Set());
              loadActivities();
            } catch (err) {
              console.error(err);
            }
          },
        },
      ]
    );
  }, [selectedIds, loadActivities]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GH.greenBright} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {selectionMode ? (
            <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerBtn}>
              <Text style={styles.headerBtnTextDestructive}>Delete ({selectedIds.size})</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setSelectionMode(true)} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Select</Text>
            </TouchableOpacity>
          )}
          {!selectionMode && (
            <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.headerBtn}>
              <Text style={{ fontSize: 22 }}>⚙️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            selectionMode={selectionMode}
            isSelected={selectedIds.has(item.id)}
            onLongPress={() => {
              setSelectionMode(true);
              toggleSelection(item.id);
            }}
            onPress={() => {
              if (selectionMode) {
                toggleSelection(item.id);
              } else {
                router.push(`/activity/${item.id}`);
              }
            }}
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
            <TouchableOpacity
              style={styles.routesEntryBtn}
              onPress={() => router.push('/heatmap' as any)}
              accessibilityRole="button"
              accessibilityLabel="View geographic heatmap"
            >
              <Text style={styles.routesEntryText}>🌍  Geographic Heatmap</Text>
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
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GH.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: GH.text,
    letterSpacing: -0.5,
  },
  headerBtn: {
    padding: 8,
  },
  headerBtnText: {
    color: GH.blue,
    fontSize: 16,
    fontWeight: '600',
  },
  headerBtnTextDestructive: {
    color: GH.red,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GH.bg,
  },
  listContent: {
    paddingHorizontal: 16,
    backgroundColor: GH.bg,
    flexGrow: 1,
  },
  listContentEmpty: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: GH.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GH.border,
  },
  cardSelected: {
    borderColor: GH.green,
    backgroundColor: '#0d1f17',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GH.muted,
    marginRight: 12,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: GH.greenBright,
    borderColor: GH.greenBright,
  },
  checkboxCheck: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardContentWrapper: {
    flex: 1,
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
