import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { type Activity } from '../db/schema';
import { formatDistance } from '../features/tracking/utils/formatters';

const GH = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  muted: '#8b949e',
  green: '#2ea043',
  greenBright: '#3fb950',
};

const HEATMAP_LEVELS = [
  '#21262d',    // level 0 (empty cell - lighter than container surface)
  '#10B98140',  // level 1 (25% opacity emerald)
  '#10B98170',  // level 2 (45% opacity emerald)
  '#10B98190',  // level 3 (60% opacity emerald)
  '#10B981',    // level 4 (solid emerald)
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
    if (!a.startedAt) continue;
    const key = a.startedAt.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + a.distanceM);
  }
  return map;
}

interface Week {
  dates: (Date | null)[]; // length 7, null for padding
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
    
    // Pad first week if it doesn't start on Sunday
    if (i === totalDays - 1 && d.getDay() !== 0) {
      for (let pad = 0; pad < d.getDay(); pad++) {
        currentWeek.push(null);
      }
    }

    currentWeek.push(d);

    if (d.getDay() === 6 || i === 0) {
      // Pad last week if it doesn't end on Saturday
      if (i === 0 && d.getDay() !== 6) {
        for (let pad = d.getDay() + 1; pad <= 6; pad++) {
          currentWeek.push(null);
        }
      }

      let monthLabel: string | undefined = undefined;
      const startOfWeek = currentWeek.find(d => d !== null);
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

export function ActivityHeatmap({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => buildHeatmapData(activities), [activities]);
  const weeks = useMemo(() => getHeatmapWeeks(), []);

  const scrollViewRef = useRef<ScrollView>(null);
  const totalActivities = activities.length;
  const totalDistance = activities.reduce((acc, a) => acc + a.distanceM, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity in the last year</Text>
        <Text style={styles.subtitle}>
          {totalActivities} activities · {formatDistance(totalDistance)} total
        </Text>
      </View>
      
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
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <Text key={i} style={styles.dayLabelText}>{day}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {weeks.map((week, wi) => (
                <View key={`week-${wi}`} style={styles.weekColumn}>
                  {week.dates.map((date, di) => {
                    if (!date) {
                      return <View key={`pad-${wi}-${di}`} style={styles.cellEmpty} />;
                    }
                    const key = date.toISOString().slice(0, 10);
                    const dist = data.get(key) ?? 0;
                    const level = getHeatmapLevel(dist);
                    return (
                      <View
                        key={key}
                        style={[styles.cell, { backgroundColor: HEATMAP_LEVELS[level] }]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  scrollContent: {
    paddingBottom: 8,
  },
  chartWrapper: {
    flexDirection: 'column',
  },
  monthsRow: {
    flexDirection: 'row',
    marginBottom: 8,
    height: 16,
  },
  dayLabelsPlaceholder: {
    width: 36,
  },
  monthColumn: {
    width: 24,
  },
  monthLabelText: {
    fontSize: 12,
    color: GH.muted,
    width: 40,
    position: 'absolute',
  },
  gridWithDays: {
    flexDirection: 'row',
  },
  dayLabels: {
    width: 36,
    flexDirection: 'column',
    gap: 4,
  },
  dayLabelText: {
    fontSize: 11,
    color: GH.text,
    height: 20,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    gap: 4,
  },
  weekColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  cell: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  cellEmpty: {
    width: 20,
    height: 20,
  },
});
