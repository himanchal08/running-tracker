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

const PERIOD_OPTIONS = ['4 weeks', '12 weeks', '6 months', '1 year'] as const;
type PeriodOption = typeof PERIOD_OPTIONS[number];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <Text style={styles.deltaNeutral}>—</Text>;
  const positive = pct >= 0;
  return (
    <Text style={positive ? styles.deltaUp : styles.deltaDown}>
      {positive ? '▲' : '▼'} {Math.abs(pct)}%
    </Text>
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
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <DeltaBadge pct={delta} />
    </View>
  );
}

function TrendCard({ trend, periodLabel }: { trend: TrendResult; periodLabel: 'week' | 'month' }) {
  const insight = generateTrendInsight(trend, periodLabel);
  if (!insight) return null;
  const color = trend.direction === 'up' ? GH.greenBright : GH.red;
  const arrow = trend.direction === 'up' ? '↑' : '↓';
  return (
    <View style={styles.trendCard}>
      <Text style={[styles.trendArrow, { color }]}>{arrow}</Text>
      <Text style={styles.trendText}>{insight}</Text>
    </View>
  );
}

function DayBar({ day, count, maxCount }: { day: string; count: number; maxCount: number }) {
  const barH = maxCount > 0 ? Math.max(4, (count / maxCount) * 60) : 4;
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

  useEffect(() => { load(); }, [load]);

  const weekCount = periodOption === '4 weeks' ? 4 : 12;
  const currentWeekStart = getWeekStart(new Date());
  const selectedWeekStart = new Date(currentWeekStart);
  selectedWeekStart.setDate(currentWeekStart.getDate() - weekOffset * 7);
  const selectedWeekEnd = getWeekEnd(selectedWeekStart);

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
    const now = getWeekStart(new Date());
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
        <ActivityIndicator size="large" color={GH.greenBright} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Lifetime Totals</Text>
      <View style={styles.lifetimeCard}>
        <View style={styles.lifetimeStat}>
          <Text style={styles.lifetimeValue}>{totalDistanceKm.toFixed(1)}</Text>
          <Text style={styles.lifetimeLabel}>Total km</Text>
        </View>
        <View style={styles.lifetimeStat}>
          <Text style={styles.lifetimeValue}>{totalDurationHours.toFixed(1)}</Text>
          <Text style={styles.lifetimeLabel}>Total hrs</Text>
        </View>
        <View style={styles.lifetimeStat}>
          <Text style={styles.lifetimeValue}>{totalActivitiesCount}</Text>
          <Text style={styles.lifetimeLabel}>Activities</Text>
        </View>
      </View>

      <View style={[styles.sectionHeader, { marginTop: 16 }]}>
        <Text style={styles.sectionTitle}>Weekly</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity
            onPress={() => setWeekOffset((o) => o + 1)}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
          >
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity
            onPress={() => setWeekOffset((o) => Math.max(0, o - 1))}
            style={[styles.navBtn, weekOffset === 0 && styles.navBtnDisabled]}
            disabled={weekOffset === 0}
            accessibilityRole="button"
            accessibilityLabel="Next week"
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

      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Trends</Text>
        <View style={styles.periodToggle}>
          {PERIOD_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.periodBtn, periodOption === opt && styles.periodBtnActive]}
              onPress={() => setPeriodOption(opt)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${opt} trends`}
            >
              <Text style={[styles.periodBtnText, periodOption === opt && styles.periodBtnTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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

      <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>
        Most active days
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
  screen: { flex: 1, backgroundColor: GH.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },
  lifetimeCard: {
    flexDirection: 'row',
    backgroundColor: '#0d1f17',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: GH.green,
    marginBottom: 8,
    justifyContent: 'space-around',
  },
  lifetimeStat: { alignItems: 'center' },
  lifetimeValue: { fontSize: 24, fontWeight: '800', color: GH.greenBright, fontVariant: ['tabular-nums'] },
  lifetimeLabel: { fontSize: 13, color: GH.muted, fontWeight: '600', marginTop: 4, textTransform: 'uppercase' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GH.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: GH.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GH.surface,
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 16, color: GH.text, fontWeight: '700' },
  navBtnTextDisabled: { color: GH.muted },
  weekLabel: { fontSize: 13, fontWeight: '600', color: GH.text, minWidth: 80, textAlign: 'center' },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricTile: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: GH.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: GH.border,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: GH.text,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: { fontSize: 10, color: GH.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  deltaUp: { fontSize: 11, color: GH.greenBright, fontWeight: '700' },
  deltaDown: { fontSize: 11, color: GH.red, fontWeight: '700' },
  deltaNeutral: { fontSize: 11, color: GH.muted },
  summaryCard: {
    backgroundColor: GH.greenFaint,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: GH.green,
  },
  summaryText: { color: GH.text, fontSize: 14, lineHeight: 20 },
  periodToggle: { flexDirection: 'row', gap: 4 },
  periodBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: GH.border,
    backgroundColor: GH.surface,
  },
  periodBtnActive: { backgroundColor: GH.greenFaint, borderColor: GH.green },
  periodBtnText: { fontSize: 12, fontWeight: '600', color: GH.muted },
  periodBtnTextActive: { color: GH.greenBright },
  trendsContainer: { gap: 8 },
  noTrends: {
    backgroundColor: GH.surface,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: GH.border,
  },
  noTrendsText: { color: GH.muted, fontSize: 14, textAlign: 'center' },
  trendCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: GH.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: GH.border,
  },
  trendArrow: { fontSize: 18, fontWeight: '700' },
  trendText: { flex: 1, color: GH.text, fontSize: 14, lineHeight: 20 },
  dayBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: GH.surface,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: GH.border,
    height: 110,
  },
  dayBarContainer: { alignItems: 'center', flex: 1, justifyContent: 'flex-end', gap: 4 },
  dayBar: {
    width: 16,
    backgroundColor: GH.greenBright,
    borderRadius: 3,
    minHeight: 4,
  },
  dayLabel: { fontSize: 10, color: GH.muted, fontWeight: '600' },
  dayCount: { fontSize: 9, color: GH.muted },
});
