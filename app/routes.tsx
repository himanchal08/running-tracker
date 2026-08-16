import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../db/client';
import { listRoutes, listAttemptsForRoute } from '../db/queries/routes';
import type { Route } from '../db/schema';
import { getBestAttempt, type AttemptWithActivity } from '../features/routes/routeAnalytics';
import { formatDistance, formatDuration } from '../features/tracking/utils/formatters';

const GH = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  muted: '#8b949e',
  green: '#2ea043',
  greenBright: '#3fb950',
  blue: '#58a6ff',
};

interface RouteWithBest {
  route: Route;
  best: AttemptWithActivity | null;
}

function RouteCard({ item, onPress }: { item: RouteWithBest; onPress: () => void }) {
  const { route, best } = item;
  const date = route.firstSeenAt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open route details. ${route.timesRepeated} attempts`}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.routeName} numberOfLines={1}>
          {route.displayName ?? `Route – ${date}`}
        </Text>
        <Text style={styles.routeMeta}>
          {route.timesRepeated} {route.timesRepeated === 1 ? 'attempt' : 'attempts'} · first on {date}
        </Text>
      </View>
      <View style={styles.cardRight}>
        {best ? (
          <>
            <Text style={styles.bestTime}>{formatDuration(best.activity.movingTimeS)}</Text>
            <Text style={styles.bestLabel}>best time</Text>
            <Text style={styles.bestDist}>{formatDistance(best.activity.distanceM)}</Text>
          </>
        ) : (
          <Text style={styles.noData}>—</Text>
        )}
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RoutesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<RouteWithBest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const routes = await listRoutes(db);
      const withBest: RouteWithBest[] = await Promise.all(
        routes.map(async (route) => {
          const attempts = await listAttemptsForRoute(db, route.id);
          const best = getBestAttempt(attempts);
          return { route, best };
        }),
      );
      setData(withBest.filter((r) => r.route.timesRepeated >= 1));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GH.greenBright} />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🗺</Text>
          <Text style={styles.emptyTitle}>No routes recognized yet</Text>
          <Text style={styles.emptySubtitle}>
            Complete the same route twice and it will appear here automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.route.id}
          renderItem={({ item }) => (
            <RouteCard
              item={item}
              onPress={() => router.push(`/route/${item.route.id}` as any)}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GH.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: GH.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: GH.muted, textAlign: 'center', lineHeight: 20 },
  list: { padding: 16, gap: 10 },
  separator: { height: 0 },
  card: {
    backgroundColor: GH.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: GH.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardLeft: { flex: 1, gap: 4 },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  routeName: { fontSize: 15, fontWeight: '700', color: GH.text },
  routeMeta: { fontSize: 12, color: GH.muted },
  bestTime: { fontSize: 18, fontWeight: '700', color: GH.greenBright, fontVariant: ['tabular-nums'] },
  bestLabel: { fontSize: 10, color: GH.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  bestDist: { fontSize: 12, color: GH.muted },
  noData: { fontSize: 16, color: GH.muted },
  chevron: { fontSize: 20, color: GH.muted, marginTop: 4 },
});
