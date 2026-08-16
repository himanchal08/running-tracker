import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../../db/client';
import { listActivities } from '../../db/queries/activities';
import type { Activity } from '../../db/schema';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
} from '../../features/tracking/utils/formatters';
import {
  getWeekStart,
  computeWeekStats,
  computeWeekDelta,
  generateWeeklySummary,
  type WeekStats,
  type WeekDelta,
} from '../../features/analysis/weeklyStats';

const GH = {
  bg: '#0d1117',
  surface: '#161b22',
  surfaceElevated: '#1c2128',
  border: '#30363d',
  text: '#c9d1d9',
  muted: '#8b949e',
  green: '#2ea043',
  greenBright: '#3fb950',
  greenFaint: '#0d4a1f',
  red: '#f85149',
  redFaint: '#3d0000',
  blue: '#58a6ff',
};

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const isPositive = pct >= 0;
  return (
    <View style={[styles.badge, isPositive ? styles.badgeGreen : styles.badgeRed]}>
      <Text style={[styles.badgeText, isPositive ? styles.badgeTextGreen : styles.badgeTextRed]}>
        {isPositive ? '▲' : '▼'} {Math.abs(pct)}%
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
  delta?: number | null;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {delta !== undefined && <DeltaBadge pct={delta} />}
    </View>
  );
}

function WeekSelector({
  weekStart,
  onPrev,
  onNext,
  isCurrentWeek,
}: {
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  isCurrentWeek: boolean;
}) {
  const label = weekStart.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  const endLabel = endDate.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={styles.weekSelector}>
      <TouchableOpacity
        style={styles.weekNavBtn}
        onPress={onPrev}
        accessibilityLabel="Previous week"
      >
        <Text style={styles.weekNavText}>‹</Text>
      </TouchableOpacity>
      <View style={styles.weekLabelContainer}>
        <Text style={styles.weekLabel}>
          {label} – {endLabel}
        </Text>
        {isCurrentWeek && (
          <View style={styles.currentWeekBadge}>
            <Text style={styles.currentWeekBadgeText}>This week</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[styles.weekNavBtn, isCurrentWeek && styles.weekNavBtnDisabled]}
        onPress={onNext}
        disabled={isCurrentWeek}
        accessibilityLabel="Next week"
      >
        <Text style={[styles.weekNavText, isCurrentWeek && styles.weekNavTextDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function WeeklyScreen() {
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const currentWeekStart = useMemo(() => getWeekStart(new Date()), []);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(currentWeekStart);

  const isCurrentWeek =
    selectedWeekStart.getTime() === currentWeekStart.getTime();

  const loadActivities = useCallback(async () => {
    try {
      const db = getDb();
      const rows = await listActivities(db, { limit: 2000 });
      setActivities(rows);
    } catch (err) {
      console.error('[WeeklyScreen] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const thisWeek = useMemo(
    () => computeWeekStats(activities, selectedWeekStart),
    [activities, selectedWeekStart],
  );

  const lastWeekStart = useMemo(() => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() - 7);
    return d;
  }, [selectedWeekStart]);

  const lastWeek = useMemo(
    () => computeWeekStats(activities, lastWeekStart),
    [activities, lastWeekStart],
  );

  const delta: WeekDelta = useMemo(
    () => computeWeekDelta(thisWeek, lastWeek),
    [thisWeek, lastWeek],
  );

  const summary = useMemo(
    () => generateWeeklySummary(thisWeek, delta),
    [thisWeek, delta],
  );

  const goToPrevWeek = useCallback(() => {
    setSelectedWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    if (!isCurrentWeek) {
      setSelectedWeekStart((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    }
  }, [isCurrentWeek]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GH.greenBright} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
    >
      <WeekSelector
        weekStart={selectedWeekStart}
        onPrev={goToPrevWeek}
        onNext={goToNextWeek}
        isCurrentWeek={isCurrentWeek}
      />

      <View style={styles.tilesGrid}>
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
          value={`${thisWeek.activeDays} / 7`}
          delta={
            delta.activeDaysDelta !== 0
              ? Math.round((delta.activeDaysDelta / 7) * 100)
              : null
          }
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>PERFORMANCE</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Avg pace</Text>
          <Text style={styles.statValue}>
            {formatPace(thisWeek.avgPaceSecPerKm)}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Avg speed</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>
              {formatSpeed(thisWeek.avgSpeedMs > 0 ? thisWeek.avgSpeedMs : null)}
            </Text>
            <DeltaBadge pct={delta.avgSpeedPct} />
          </View>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Elevation gained</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>
              +{Math.round(thisWeek.elevationGainM)} m
            </Text>
            <DeltaBadge pct={delta.elevationPct} />
          </View>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Calories</Text>
          <Text style={styles.statValue}>
            {Math.round(thisWeek.caloriesKcal)} kcal
          </Text>
        </View>
        {thisWeek.longestActivityDistM > 0 && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Longest activity</Text>
            <Text style={styles.statValue}>
              {formatDistance(thisWeek.longestActivityDistM)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>WEEKLY SUMMARY</Text>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GH.bg },
  content: { padding: 16 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GH.bg,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GH.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GH.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  weekNavBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavBtnDisabled: { opacity: 0.3 },
  weekNavText: { fontSize: 22, color: GH.text, fontWeight: '300' },
  weekNavTextDisabled: { color: GH.muted },
  weekLabelContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: GH.text,
    textAlign: 'center',
  },
  currentWeekBadge: {
    backgroundColor: GH.greenFaint,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: GH.green,
  },
  currentWeekBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: GH.greenBright,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  tile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: GH.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GH.border,
    padding: 14,
    gap: 4,
  },
  tileLabel: { fontSize: 11, color: GH.muted, fontWeight: '600' },
  tileValue: {
    fontSize: 22,
    fontWeight: '700',
    color: GH.text,
    letterSpacing: -0.5,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    marginTop: 2,
  },
  badgeGreen: { backgroundColor: GH.greenFaint, borderColor: GH.green },
  badgeRed: { backgroundColor: GH.redFaint, borderColor: '#6e1313' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextGreen: { color: GH.greenBright },
  badgeTextRed: { color: GH.red },
  sectionCard: {
    backgroundColor: GH.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GH.border,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: GH.muted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GH.border,
  },
  statLabel: { fontSize: 14, color: GH.muted, fontWeight: '500' },
  statValue: { fontSize: 14, color: GH.text, fontWeight: '600' },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryCard: {
    backgroundColor: GH.greenFaint,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GH.green,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: GH.greenBright,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: GH.text,
    lineHeight: 22,
  },
});
