import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { type Activity } from '../db/schema';
import { formatDistance, formatDuration, ACTIVITY_TYPE_EMOJI, ACTIVITY_TYPE_LABELS } from '../features/tracking/utils/formatters';
import {
  type CalendarMetric,
  type DayData,
  buildDailyMap,
  getDayValue,
  getHeatLevel,
  getMonthlyTotals,
  getYearlyTotals,
} from '../features/analysis/calendarStats';

const GH = {
  bg: '#0d1117',
  surface: '#161b22',
  surfaceElevated: '#1c2128',
  border: '#30363d',
  text: '#c9d1d9',
  muted: '#8b949e',
  green: '#2ea043',
  greenBright: '#3fb950',
  blue: '#58a6ff',
};

const HEATMAP_COLORS: Record<CalendarMetric, [string, string, string, string, string]> = {
  distance:  ['#21262d', '#0e4429', '#006d32', '#26a641', '#39d353'],
  time:      ['#21262d', '#0d2b4f', '#0a4b8c', '#1567c4', '#4493f8'],
  calories:  ['#21262d', '#4a1942', '#7d1f6e', '#b42e9e', '#e040fb'],
  elevation: ['#21262d', '#3b2800', '#6d4c00', '#a87200', '#f59e0b'],
  count:     ['#21262d', '#1b4332', '#2d6a4f', '#40916c', '#52b788'],
};

const METRIC_LABELS: Record<CalendarMetric, string> = {
  distance: 'Distance',
  time: 'Time',
  calories: 'Calories',
  elevation: 'Elevation',
  count: 'Count',
};

const METRICS: CalendarMetric[] = ['distance', 'time', 'calories', 'elevation', 'count'];

interface Week {
  dates: (Date | null)[];
  monthLabel?: string;
}

function getHeatmapWeeks(): Week[] {
  const weeks: Week[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysSinceSunday = today.getDay();
  const totalDays = 51 * 7 + daysSinceSunday + 1;

  let currentWeek: (Date | null)[] = [];
  let lastMonth = -1;

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    if (i === totalDays - 1 && d.getDay() !== 0) {
      for (let pad = 0; pad < d.getDay(); pad++) currentWeek.push(null);
    }

    currentWeek.push(d);

    if (d.getDay() === 6 || i === 0) {
      if (i === 0 && d.getDay() !== 6) {
        for (let pad = d.getDay() + 1; pad <= 6; pad++) currentWeek.push(null);
      }
      let monthLabel: string | undefined;
      const startOfWeek = currentWeek.find((x) => x !== null);
      if (startOfWeek && startOfWeek.getMonth() !== lastMonth) {
        lastMonth = startOfWeek.getMonth();
        monthLabel = startOfWeek.toLocaleString('default', { month: 'short' });
      }
      weeks.push({ dates: [...currentWeek], monthLabel });
      currentWeek = [];
    }
  }
  return weeks;
}

function formatMetricValue(value: number, metric: CalendarMetric): string {
  switch (metric) {
    case 'distance':  return formatDistance(value);
    case 'time':      return formatDuration(value);
    case 'calories':  return `${Math.round(value)} kcal`;
    case 'elevation': return `${Math.round(value)} m`;
    case 'count':     return `${value} act.`;
  }
}

function DayModal({
  dayData,
  visible,
  onClose,
}: {
  dayData: DayData | null;
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  if (!dayData) return null;

  const dateLabel = new Date(dayData.date + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalDateLabel}>{dateLabel}</Text>
          <Text style={styles.modalSubLabel}>
            {dayData.activities.length} {dayData.activities.length === 1 ? 'activity' : 'activities'}
          </Text>
          <FlatList
            data={dayData.activities}
            keyExtractor={(a) => a.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalActivityRow}
                onPress={() => {
                  onClose();
                  router.push(`/activity/${item.id}`);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.modalActivityEmoji}>
                  {ACTIVITY_TYPE_EMOJI[item.type] ?? '📍'}
                </Text>
                <View style={styles.modalActivityInfo}>
                  <Text style={styles.modalActivityType}>
                    {ACTIVITY_TYPE_LABELS[item.type] ?? 'Activity'}
                  </Text>
                  <Text style={styles.modalActivityStat}>
                    {formatDistance(item.distanceM)} · {formatDuration(item.movingTimeS)}
                  </Text>
                </View>
                <Text style={styles.modalActivityChevron}>›</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ActivityHeatmap({ activities }: { activities: Activity[] }) {
  const [metric, setMetric] = useState<CalendarMetric>('distance');
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const dailyMap = useMemo(() => buildDailyMap(activities), [activities]);
  const weeks     = useMemo(() => getHeatmapWeeks(), []);
  const yearly    = useMemo(() => getYearlyTotals(activities), [activities]);
  const monthly   = useMemo(() => getMonthlyTotals(activities), [activities]);

  const colors = HEATMAP_COLORS[metric];

  const handleCellPress = useCallback((date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const day = dailyMap.get(key);
    if (!day || day.activities.length === 0) return;
    const value = getDayValue(day, metric);
    setSelectedDay({ ...day, value });
    setModalVisible(true);
  }, [dailyMap, metric]);

  const closeModal = useCallback(() => setModalVisible(false), []);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.yearlyRow}>
          <View style={styles.yearlyItem}>
            <Text style={styles.yearlyValue}>{yearly.count}</Text>
            <Text style={styles.yearlyLabel}>Activities</Text>
          </View>
          <View style={styles.yearlyDivider} />
          <View style={styles.yearlyItem}>
            <Text style={styles.yearlyValue}>{formatDistance(yearly.distanceM)}</Text>
            <Text style={styles.yearlyLabel}>Total distance</Text>
          </View>
          <View style={styles.yearlyDivider} />
          <View style={styles.yearlyItem}>
            <Text style={styles.yearlyValue}>{yearly.activeDays}</Text>
            <Text style={styles.yearlyLabel}>Active days</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricToggleRow}
        >
          {METRICS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.metricChip, metric === m && styles.metricChipActive]}
              onPress={() => setMetric(m)}
              accessibilityRole="radio"
              accessibilityState={{ selected: metric === m }}
            >
              <Text style={[styles.metricChipText, metric === m && styles.metricChipTextActive]}>
                {METRIC_LABELS[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          <View style={styles.chartWrapper}>
            <View style={styles.monthsRow}>
              <View style={styles.dayLabelsPlaceholder} />
              {weeks.map((week, i) => (
                <View key={`month-${i}`} style={styles.monthColumn}>
                  {week.monthLabel && (
                    <Text style={styles.monthLabelText}>{week.monthLabel}</Text>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.gridWithDays}>
              <View style={styles.dayLabels}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={i} style={styles.dayLabelText}>{d}</Text>
                ))}
              </View>

              <View style={styles.grid}>
                {weeks.map((week, wi) => (
                  <View key={`week-${wi}`} style={styles.weekColumn}>
                    {week.dates.map((date, di) => {
                      if (!date) {
                        return <View key={`pad-${wi}-${di}`} style={styles.cellEmpty} />;
                      }
                      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      const day = dailyMap.get(key);
                      const value = day ? getDayValue(day, metric) : 0;
                      const level = getHeatLevel(value, metric);
                      const hasTap = level > 0;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[styles.cell, { backgroundColor: colors[level] }]}
                          onPress={() => hasTap && handleCellPress(date)}
                          disabled={!hasTap}
                          activeOpacity={hasTap ? 0.7 : 1}
                          accessibilityRole={hasTap ? 'button' : 'none'}
                          accessibilityLabel={hasTap ? `${key}: ${formatMetricValue(value, metric)}` : undefined}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>Less</Text>
          {colors.map((c, i) => (
            <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />
          ))}
          <Text style={styles.legendLabel}>More</Text>
        </View>

        {monthly.length > 0 && (
          <View style={styles.monthlySectionHeader}>
            <Text style={styles.monthlySectionTitle}>MONTHLY TOTALS</Text>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthlyScrollContent}
        >
          {monthly.slice(-6).map((m) => (
            <View key={`${m.year}-${m.monthIndex}`} style={styles.monthlyCard}>
              <Text style={styles.monthlyCardMonth}>{m.month.slice(0, 3)}</Text>
              <Text style={styles.monthlyCardYear}>{m.year}</Text>
              <Text style={styles.monthlyCardValue}>{formatDistance(m.distanceM)}</Text>
              <Text style={styles.monthlyCardSub}>{m.count} act.</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <DayModal
        dayData={selectedDay}
        visible={modalVisible}
        onClose={closeModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: GH.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GH.border,
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  yearlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GH.border,
  },
  yearlyItem: { alignItems: 'center' },
  yearlyValue: { fontSize: 17, fontWeight: '700', color: GH.text },
  yearlyLabel: { fontSize: 10, color: GH.muted, marginTop: 2, fontWeight: '500' },
  yearlyDivider: { width: 1, height: 32, backgroundColor: GH.border },
  metricToggleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    paddingRight: 4,
  },
  metricChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GH.border,
    backgroundColor: GH.bg,
  },
  metricChipActive: {
    backgroundColor: GH.green,
    borderColor: GH.greenBright,
  },
  metricChipText: { fontSize: 12, color: GH.muted, fontWeight: '600' },
  metricChipTextActive: { color: '#ffffff' },
  scrollContent: { paddingBottom: 4 },
  chartWrapper: { flexDirection: 'column' },
  monthsRow: {
    flexDirection: 'row',
    marginBottom: 6,
    height: 14,
  },
  dayLabelsPlaceholder: { width: 18 },
  monthColumn: { width: 22 },
  monthLabelText: {
    fontSize: 10,
    color: GH.muted,
    width: 36,
    position: 'absolute',
  },
  gridWithDays: { flexDirection: 'row' },
  dayLabels: {
    width: 18,
    flexDirection: 'column',
    gap: 3,
    marginRight: 2,
  },
  dayLabelText: {
    fontSize: 9,
    color: GH.muted,
    height: 18,
    lineHeight: 18,
  },
  grid: { flexDirection: 'row', gap: 3 },
  weekColumn: { flexDirection: 'column', gap: 3 },
  cell: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  cellEmpty: { width: 18, height: 18 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  legendLabel: { fontSize: 10, color: GH.muted },
  legendCell: { width: 14, height: 14, borderRadius: 2 },
  monthlySectionHeader: {
    marginTop: 14,
    marginBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GH.border,
    paddingTop: 12,
  },
  monthlySectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: GH.muted,
    letterSpacing: 0.8,
  },
  monthlyScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  monthlyCard: {
    backgroundColor: GH.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GH.border,
    padding: 10,
    alignItems: 'center',
    minWidth: 72,
  },
  monthlyCardMonth: { fontSize: 13, fontWeight: '700', color: GH.text },
  monthlyCardYear: { fontSize: 10, color: GH.muted, marginBottom: 6 },
  monthlyCardValue: { fontSize: 13, fontWeight: '700', color: GH.greenBright },
  monthlyCardSub: { fontSize: 10, color: GH.muted, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: GH.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: GH.border,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: GH.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalDateLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: GH.text,
    marginBottom: 2,
  },
  modalSubLabel: {
    fontSize: 13,
    color: GH.muted,
    marginBottom: 16,
  },
  modalActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GH.border,
  },
  modalActivityEmoji: { fontSize: 22, marginRight: 12 },
  modalActivityInfo: { flex: 1 },
  modalActivityType: {
    fontSize: 15,
    fontWeight: '600',
    color: GH.text,
  },
  modalActivityStat: {
    fontSize: 12,
    color: GH.muted,
    marginTop: 2,
  },
  modalActivityChevron: {
    fontSize: 20,
    color: GH.muted,
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GH.border,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: GH.muted,
  },
});
