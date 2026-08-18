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
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { M, RADIUS } from '../../constants/theme';
import { getDb } from '../../db/client';
import { listActivities, deleteActivities, getCurrentStreak } from '../../db/queries/activities';
import type { Activity } from '../../db/schema';
import {
  formatDistance,
  formatDuration,
  computePaceSecPerUnit,
  formatActivityDate,
  ACTIVITY_TYPE_EMOJI,
  ACTIVITY_TYPE_LABELS,
} from '../../features/tracking/utils/formatters';

const HEATMAP_LEVELS = [
  '#161b22',
  '#0e4429',
  '#006d32',
  '#26a641',
  '#39d353',
];

import { ActivityHeatmap } from '../../components/ActivityHeatmap';

const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  running:  { bg: M.tealFaint, text: M.teal, border: M.tealBorder },
  walking:  { bg: 'rgba(59,130,246,0.1)', text: M.blue, border: 'rgba(59,130,246,0.2)' },
  cycling:  { bg: M.amberFaint, text: M.amber, border: M.amberBorder },
  hiking:   { bg: '#1d1f0d', text: '#b5bd00', border: '#7d8200' },
  unknown:  { bg: M.surface, text: M.textSecondary, border: M.border },
};

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
  const badgeColors = TYPE_BADGE_COLORS[activity.type] ?? TYPE_BADGE_COLORS.unknown;

  const paceDisplay = (() => {
    if (!pace || pace <= 0) return '--';
    const mins = Math.floor(pace / 60);
    const secs = Math.round(pace % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  })();

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.75}
    >
      {selectionMode && (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
        </View>
      )}
      <View style={styles.cardContentWrapper}>
        <View style={styles.cardHeader}>
          <View style={[
            styles.typeBadge,
            { backgroundColor: badgeColors.bg, borderColor: badgeColors.border }
          ]}>
            <Text style={styles.typeBadgeEmoji}>{ACTIVITY_TYPE_EMOJI[activity.type] ?? '📍'}</Text>
            <Text style={[styles.typeBadgeText, { color: badgeColors.text }]}>
              {ACTIVITY_TYPE_LABELS[activity.type] ?? 'Activity'}
            </Text>
          </View>
          <Text style={styles.cardDate}>{formatActivityDate(activity.startedAt)}</Text>
        </View>

        <View style={styles.cardPrimaryRow}>
          <Text style={styles.cardDistanceValue}>{(activity.distanceM / 1000).toFixed(2)}</Text>
          <Text style={styles.cardDistanceUnit}>KM</Text>
        </View>

        <View style={styles.cardStats}>
          <Text style={styles.statValue}>{formatDuration(activity.movingTimeS)}</Text>
          <Text style={styles.statDivider}>·</Text>
          <Text style={styles.statValue}>{paceDisplay} /km</Text>
          <Text style={styles.statDivider}>·</Text>
          <Text style={styles.statValue}>{Math.round(activity.elevationGainM)}m</Text>
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
  const [fontsLoaded] = useFonts({ PlayfairDisplay_700Bold });

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState({ current: 0, isAliveToday: false });

  const loadActivities = useCallback(async () => {
    try {
      const db = getDb();
      const rows = await listActivities(db);
      setActivities(rows);
      
      const currentStreak = await getCurrentStreak(db);
      setStreak(currentStreak);
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
        <ActivityIndicator size="large" color={M.teal} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {selectionMode ? (
          <>
            <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedIds(new Set()); }} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {selectedIds.size} Selected
            </Text>
            <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerBtn} disabled={selectedIds.size === 0}>
              <Text style={[styles.headerBtnTextDestructive, selectedIds.size === 0 && { opacity: 0.5 }]}>Delete</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.headerTitle, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}>History</Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>{streak.isAliveToday || streak.current > 0 ? '🔥' : '🧊'}</Text>
              <Text style={[styles.streakText, streak.isAliveToday && { color: M.amber }]}>{streak.current} days</Text>
            </View>
          </>
        )}
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>RECENT RUNS</Text>
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
            tintColor={M.teal}
          />
        }
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: M.bgAlt,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: M.textPrimary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: M.surfaceBright,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: M.borderSubtle,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '500',
    color: M.textPrimary,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: M.textSecondary,
    letterSpacing: 0.1,
  },
  headerBtn: {
    padding: 8,
  },
  headerBtnText: {
    color: M.blue,
    fontSize: 16,
    fontWeight: '600',
  },
  headerBtnTextDestructive: {
    color: M.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  routesEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M.surface,
    padding: 16,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: M.borderFaint,
    marginTop: 12,
  },
  routesEntryText: {
    fontSize: 15,
    fontWeight: '600',
    color: M.textPrimary,
  },
  routesEntryChevron: {
    fontSize: 20,
    color: M.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M.bgAlt,
  },
  listContent: {
    paddingHorizontal: 20,
    backgroundColor: M.bgAlt,
    flexGrow: 1,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M.surface,
    borderRadius: RADIUS.card,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: M.borderFaint,
    gap: 16,
  },
  cardSelected: {
    borderColor: M.tealBorder,
    backgroundColor: M.tealFaint,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: M.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: M.teal,
    borderColor: M.teal,
  },
  checkboxCheck: {
    color: M.bg,
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
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: M.textPrimary,
  },
  cardDate: {
    fontSize: 10,
    color: M.textSecondary,
    fontWeight: '400',
    letterSpacing: 0.05,
    textTransform: 'uppercase',
  },
  cardPrimaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  cardDistanceValue: {
    fontSize: 40,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontWeight: '700',
    color: M.textPrimary,
    lineHeight: 40,
  },
  cardDistanceUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: M.teal,
    letterSpacing: 0.1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  typeBadgeEmoji: {
    fontSize: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 16,
    color: M.textSecondary,
  },
  statDivider: {
    fontSize: 16,
    color: M.textMuted,
  },
  gpsWarning: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: M.borderFaint,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  gpsWarningText: {
    fontSize: 12,
    color: M.amber,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 80,
  },
  emptyEmoji: {
    fontSize: 56,
    lineHeight: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: M.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: M.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
