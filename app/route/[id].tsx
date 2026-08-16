import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../../db/client';
import { getRoute, listAttemptsForRoute } from '../../db/queries/routes';
import type { Route, Activity, RouteAttempt } from '../../db/schema';
import {
  getRouteAttemptsSorted,
  getBestAttempt,
  formatDelta,
  computeDeltaVsBest,
  getRouteSummary,
  type AttemptWithActivity,
} from '../../features/routes/routeAnalytics';
import { formatDistance, formatDuration } from '../../features/tracking/utils/formatters';

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
  yellow: '#d29922',
};

function AttemptCard({
  item,
  isBest,
  onPress,
}: {
  item: AttemptWithActivity;
  isBest: boolean;
  onPress: () => void;
}) {
  const best = isBest ? null : getBestAttemptDelta(item);
  const date = item.activity.startedAt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity
      style={[styles.attemptCard, isBest && styles.attemptCardBest]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View activity from ${date}`}
    >
      <View style={styles.attemptLeft}>
        {isBest && (
          <View style={styles.bestBadge}>
            <Text style={styles.bestBadgeText}>🏆 Best</Text>
          </View>
        )}
        <Text style={styles.attemptDate}>{date}</Text>
        <Text style={styles.attemptType}>{item.activity.type}</Text>
      </View>
      <View style={styles.attemptRight}>
        <Text style={styles.attemptTime}>{formatDuration(item.activity.movingTimeS)}</Text>
        <Text style={styles.attemptDist}>{formatDistance(item.activity.distanceM)}</Text>
        {item.attempt.deltaVsBestS != null && !isBest && (
          <Text style={[
            styles.attemptDelta,
            item.attempt.deltaVsBestS <= 0 ? styles.deltaGood : styles.deltaBad,
          ]}>
            {formatDelta(item.attempt.deltaVsBestS)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function getBestAttemptDelta(_item: AttemptWithActivity): number | null {
  return null;
}

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [route, setRoute] = useState<Route | null>(null);
  const [attempts, setAttempts] = useState<AttemptWithActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const db = getDb();
      const [r, rawAttempts] = await Promise.all([
        getRoute(db, id),
        listAttemptsForRoute(db, id),
      ]);
      setRoute(r);
      const sorted = getRouteAttemptsSorted(
        rawAttempts.map((ra) => ra.attempt),
        rawAttempts.map((ra) => ra.activity),
      );
      setAttempts(sorted);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const best = getBestAttempt(attempts);

  const stats = [
    { label: 'Total attempts', value: String(attempts.length) },
    {
      label: 'Best time',
      value: best ? formatDuration(best.activity.movingTimeS) : '—',
    },
    {
      label: 'Best distance',
      value: best ? formatDistance(best.activity.distanceM) : '—',
    },
    {
      label: 'First recorded',
      value: route ? route.firstSeenAt.toLocaleDateString() : '—',
    },
  ];

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {route?.displayName ?? 'Route'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GH.greenBright} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statsRow}>
            {stats.map((s) => (
              <View key={s.label} style={styles.statTile}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {route && attempts.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                {getRouteSummary(route, attempts)}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>All Attempts</Text>

          {attempts.length === 0 ? (
            <Text style={styles.empty}>No attempts recorded yet.</Text>
          ) : (
            attempts.map((item) => (
              <AttemptCard
                key={item.attempt.id}
                item={item}
                isBest={best?.activity.id === item.activity.id}
                onPress={() => router.push(`/activity/${item.activity.id}`)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GH.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GH.border,
    backgroundColor: GH.surface,
    gap: 12,
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: { color: GH.blue, fontSize: 15, fontWeight: '600' },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: GH.text,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 16 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: GH.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: GH.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: GH.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: 11, color: GH.muted, marginTop: 4 },
  summaryCard: {
    backgroundColor: GH.greenFaint,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: GH.green,
  },
  summaryText: { color: GH.text, fontSize: 14, lineHeight: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GH.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  empty: { color: GH.muted, fontSize: 14, textAlign: 'center', marginTop: 24 },
  attemptCard: {
    backgroundColor: GH.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: GH.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attemptCardBest: {
    borderColor: GH.green,
    backgroundColor: '#0d1f17',
  },
  attemptLeft: { gap: 4 },
  attemptRight: { alignItems: 'flex-end', gap: 4 },
  bestBadge: {
    backgroundColor: GH.greenFaint,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  bestBadgeText: { color: GH.greenBright, fontSize: 11, fontWeight: '700' },
  attemptDate: { fontSize: 14, fontWeight: '600', color: GH.text },
  attemptType: { fontSize: 12, color: GH.muted, textTransform: 'capitalize' },
  attemptTime: { fontSize: 16, fontWeight: '700', color: GH.text, fontVariant: ['tabular-nums'] },
  attemptDist: { fontSize: 12, color: GH.muted },
  attemptDelta: { fontSize: 13, fontWeight: '600' },
  deltaGood: { color: GH.greenBright },
  deltaBad: { color: GH.red },
});
