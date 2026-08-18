import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { M, RADIUS } from '../../constants/theme';
import { getDb } from '../../db/client';
import { listActivities } from '../../db/queries/activities';
import type { Activity } from '../../db/schema';
import {
  getWeekStart,
  getWeekEnd,
  computeWeekStats,
  computeWeekDelta,
  generateWeeklySummary,
  type WeekStats,
  type WeekDelta,
} from '../../features/analysis/weeklyStats';
import {
  computePeriodStats,
  getWeekWindows,
  getMonthWindows,
  computeTrends,
  generateTrendInsight,
  getDayOfWeekDistribution,
  type TrendResult,
} from '../../features/analysis/trendAnalysis';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
} from '../../features/tracking/utils/formatters';

const PERIOD_OPTIONS = ['4 weeks', '12 weeks', '6 months', '1 year'] as const;
type PeriodOption = typeof PERIOD_OPTIONS[number];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <Text style={styles.deltaNeutral}>—</Text>;
  const positive = pct >= 0;
  return (
    <View style={styles.deltaBadgeWrap}>
      <Text style={positive ? styles.deltaUp : styles.deltaDown}>
        {positive ? '▲' : '▼'} {Math.abs(pct)}%
      </Text>
    </View>
  );
}

function MetricTile({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: number | null;
}) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <DeltaBadge pct={delta} />
    </View>
  );
}

function TrendCard({ trend, periodLabel }: { trend: TrendResult; periodLabel: 'week' | 'month' }) {
  const insight = generateTrendInsight(trend, periodLabel);
  if (!insight) return null;
  const color = trend.direction === 'up' ? M.teal : M.danger;
  const arrow = trend.direction === 'up' ? '↑' : '↓';
  return (
    <View style={styles.trendCard}>
      <View style={[styles.trendIconWrap, { backgroundColor: trend.direction === 'up' ? M.tealFaint : 'rgba(255,180,171,0.1)' }]}>
        <Text style={[styles.trendArrow, { color }]}>{arrow}</Text>
      </View>
      <Text style={styles.trendText}>{insight}</Text>
    </View>
  );
}

function DayBar({ day, count, maxCount }: { day: string; count: number; maxCount: number }) {
  const barH = maxCount > 0 ? Math.max(4, (count / maxCount) * 80) : 4;
  return (
    <View style={styles.dayBarContainer}>
      <View style={[styles.dayBar, { height: barH }]} />
      <Text style={styles.dayLabel}>{day}</Text>
      <Text style={styles.dayCount}>{count}</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ PlayfairDisplay_700Bold });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [periodOption, setPeriodOption] = useState<PeriodOption>('4 weeks');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const rows = await listActivities(db, { limit: 10000 });
      setActivities(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const currentWeekStart = getWeekStart(new Date());
  const selectedWeekStart = new Date(currentWeekStart);
  selectedWeekStart.setDate(currentWeekStart.getDate() - weekOffset * 7);

  const thisWeek = computeWeekStats(activities, selectedWeekStart);
  const prevWeekStart = new Date(selectedWeekStart);
  prevWeekStart.setDate(selectedWeekStart.getDate() - 7);
  const lastWeek = computeWeekStats(activities, prevWeekStart);
  const delta = computeWeekDelta(thisWeek, lastWeek);
  const summary = generateWeeklySummary(thisWeek, delta);

  const isMonthMode = periodOption === '6 months' || periodOption === '1 year';
  const windowCount = periodOption === '4 weeks' ? 4 : periodOption === '12 weeks' ? 12 : periodOption === '6 months' ? 6 : 12;

  const windows = isMonthMode ? getMonthWindows(windowCount) : getWeekWindows(windowCount);
  const periodStats = windows.map((w) =>
    computePeriodStats(activities, w.start, w.end),
  );
  const trends = computeTrends(periodStats);
  const dayDist = getDayOfWeekDistribution(activities);
  const maxDayCount = Math.max(...dayDist.map((d) => d.count), 1);

  const pace = thisWeek.avgPaceSecPerKm;
  const weekLabel = (() => {
    if (weekOffset === 0) return 'This week';
    if (weekOffset === 1) return 'Last week';
    return selectedWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  })();

  const totalDistanceKm = activities.reduce((sum, a) => sum + a.distanceM, 0) / 1000;
  const totalDurationHours = activities.reduce((sum, a) => sum + a.movingTimeS, 0) / 3600;
  const totalActivitiesCount = activities.length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={M.teal} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>LIFETIME TOTALS</Text>
      <View style={styles.lifetimeCard}>
        <View style={styles.lifetimeStat}>
          <Text style={[styles.lifetimeValue, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}>{totalDistanceKm.toFixed(1)}</Text>
          <Text style={styles.lifetimeLabel}>Total km</Text>
        </View>
        <View style={styles.lifetimeStat}>
          <Text style={[styles.lifetimeValue, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}>{totalDurationHours.toFixed(1)}</Text>
          <Text style={styles.lifetimeLabel}>Total hrs</Text>
        </View>
        <View style={styles.lifetimeStat}>
          <Text style={[styles.lifetimeValue, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}>{totalActivitiesCount}</Text>
          <Text style={styles.lifetimeLabel}>Activities</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>WEEKLY PROGRESS</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity
            onPress={() => setWeekOffset((o) => o + 1)}
            style={styles.navBtn}
          >
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity
            onPress={() => setWeekOffset((o) => Math.max(0, o - 1))}
            style={[styles.navBtn, weekOffset === 0 && styles.navBtnDisabled]}
            disabled={weekOffset === 0}
          >
            <Text style={[styles.navBtnText, weekOffset === 0 && styles.navBtnTextDisabled]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricTile
          label="Distance"
          value={formatDistance(thisWeek.distanceM)}
          delta={delta.distancePct}
        />
        <MetricTile
          label="Moving time"
          value={formatDuration(thisWeek.movingTimeS)}
          delta={delta.timePct}
        />
        <MetricTile
          label="Activities"
          value={String(thisWeek.count)}
          delta={delta.countPct}
        />
        <MetricTile
          label="Active days"
          value={`${thisWeek.activeDays}/7`}
          delta={delta.activeDaysDelta !== 0 ? delta.activeDaysDelta * 100 : null}
        />
        <MetricTile
          label="Avg pace"
          value={formatPace(pace)}
          delta={delta.avgSpeedPct !== null ? -delta.avgSpeedPct : null}
        />
        <MetricTile
          label="Elevation"
          value={`${Math.round(thisWeek.elevationGainM)} m`}
          delta={delta.elevationPct}
        />
      </View>

      {summary ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
      ) : null}

      <View style={[styles.sectionHeader, { marginBottom: 16 }]}>
        <Text style={styles.sectionTitle}>TRENDS & INSIGHTS</Text>
      </View>
      <View style={styles.periodToggle}>
        {PERIOD_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.periodBtn, periodOption === opt && styles.periodBtnActive]}
            onPress={() => setPeriodOption(opt)}
          >
            <Text style={[styles.periodBtnText, periodOption === opt && styles.periodBtnTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.trendsContainer}>
        {trends.filter((t) => t.isSignificant).length === 0 ? (
          <View style={styles.noTrends}>
            <Text style={styles.noTrendsText}>
              No significant trends detected yet. Keep recording activities!
            </Text>
          </View>
        ) : (
          trends.map((t) => <TrendCard key={t.metric} trend={t} periodLabel={isMonthMode ? 'month' : 'week'} />)
        )}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 32, marginBottom: 16 }]}>
        ACTIVITY FREQUENCY
      </Text>
      <View style={styles.dayBarsRow}>
        {dayDist.map((d) => (
          <DayBar key={d.day} day={d.day} count={d.count} maxCount={maxDayCount} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: M.bgAlt },
  screen: { flex: 1, backgroundColor: M.bgAlt },
  content: { padding: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: M.textSecondary,
    letterSpacing: 0.1,
  },
  lifetimeCard: {
    flexDirection: 'row',
    backgroundColor: M.card,
    borderRadius: RADIUS.card,
    padding: 24,
    borderWidth: 1,
    borderColor: M.border,
    marginBottom: 32,
  },
  lifetimeStat: { flex: 1, alignItems: 'center' },
  lifetimeValue: { fontSize: 24, fontWeight: '700', color: M.textPrimary, fontVariant: ['tabular-nums'] },
  lifetimeLabel: { fontSize: 10, color: M.textSecondary, textTransform: 'uppercase', letterSpacing: 0.05, marginTop: 4 },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navBtn: { padding: 4, paddingHorizontal: 12 },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 20, color: M.teal, fontWeight: '600' },
  navBtnTextDisabled: { color: M.textSecondary },
  weekLabel: { fontSize: 13, fontWeight: '600', color: M.textPrimary, minWidth: 80, textAlign: 'center' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  metricTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: M.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: M.borderFaint,
    alignItems: 'flex-start',
    gap: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: M.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: { fontSize: 10, color: M.textSecondary, textTransform: 'uppercase', letterSpacing: 0.1 },
  deltaBadgeWrap: {
    backgroundColor: M.tealFaint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: M.tealBorder,
    marginTop: 4,
  },
  deltaUp: { fontSize: 10, color: M.teal, fontWeight: '700' },
  deltaDown: { fontSize: 10, color: M.danger, fontWeight: '700' },
  deltaNeutral: { fontSize: 10, color: M.textMuted },
  summaryCard: {
    backgroundColor: M.surfaceBright,
    borderRadius: RADIUS.card,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: M.borderFaint,
  },
  summaryText: { color: M.textPrimary, fontSize: 14, lineHeight: 22 },
  periodToggle: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  periodBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: M.surfaceBright,
  },
  periodBtnActive: { backgroundColor: M.tealFaint, borderColor: M.tealBorder },
  periodBtnText: { fontSize: 12, fontWeight: '600', color: M.textPrimary },
  periodBtnTextActive: { color: M.teal },
  trendsContainer: { gap: 12 },
  noTrends: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.card,
    padding: 24,
    borderWidth: 1,
    borderColor: M.borderFaint,
    borderStyle: 'dashed',
  },
  noTrendsText: { color: M.textSecondary, fontSize: 14, textAlign: 'center' },
  trendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: M.surface,
    borderRadius: RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: M.borderFaint,
  },
  trendIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendArrow: { fontSize: 16, fontWeight: '700' },
  trendText: { flex: 1, color: M.textPrimary, fontSize: 14, lineHeight: 20 },
  dayBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: M.card,
    borderRadius: RADIUS.card,
    padding: 24,
    borderWidth: 1,
    borderColor: M.border,
    height: 140,
  },
  dayBarContainer: { alignItems: 'center', flex: 1, justifyContent: 'flex-end', gap: 6 },
  dayBar: {
    width: 20,
    backgroundColor: M.teal,
    borderRadius: 4,
    minHeight: 4,
  },
  dayLabel: { fontSize: 10, color: M.textSecondary, fontWeight: '600' },
  dayCount: { fontSize: 9, color: M.textMuted },
});
