import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../db/client';
import { listActivities } from '../db/queries/activities';
import { PRCategory, PR_LABELS } from '../features/analysis/personalRecords';
import { computePRProgression, type PRTimelineEvent } from '../features/analysis/prHistory';
import { formatDistance, formatDuration, formatActivityDate } from '../features/tracking/utils/formatters';

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

function formatValue(value: number, catId: string): string {
  if (catId.startsWith('fastest_')) return formatDuration(value);
  if (catId.startsWith('longest_')) return formatDistance(value);
  if (catId === 'most_elevation') return `${Math.round(value)}m`;
  return value.toString();
}

export default function PRHistoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [timeline, setTimeline] = useState<PRTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const label = PR_LABELS[category as PRCategory];

  useEffect(() => {
    if (!category || !label) return;
    async function load() {
      try {
        const db = getDb();
        const activities = await listActivities(db, { limit: 10000 });
        const events = computePRProgression(activities, category as PRCategory);
        setTimeline(events);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category, label]);

  if (!label) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Invalid PR category.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{label} History</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GH.greenBright} />
        </View>
      ) : timeline.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No records broken yet.</Text>
        </View>
      ) : (
        <FlatList
          data={timeline}
          keyExtractor={(item) => item.activityId}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          renderItem={({ item, index }) => {
            const isCurrentPR = index === 0;
            return (
              <View style={styles.timelineRow}>
                <View style={styles.timelineStem}>
                  <View style={[styles.dot, isCurrentPR && styles.dotActive]} />
                  {index !== timeline.length - 1 && <View style={styles.line} />}
                </View>
                
                <TouchableOpacity
                  style={[styles.card, isCurrentPR && styles.cardActive]}
                  onPress={() => router.push(`/activity/${item.activityId}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.valueText, isCurrentPR && styles.valueTextActive]}>
                      {formatValue(item.value, category as string)}
                    </Text>
                    {isCurrentPR && <Text style={styles.badge}>CURRENT PR</Text>}
                  </View>
                  <Text style={styles.dateText}>{formatActivityDate(item.date)}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GH.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GH.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: GH.text },
  headerBtn: { padding: 8, marginLeft: -8 },
  headerBtnText: { color: GH.blue, fontSize: 16 },
  errorText: { color: GH.muted, fontSize: 16, marginBottom: 16 },
  backBtn: { padding: 12, backgroundColor: GH.surface, borderRadius: 8 },
  backBtnText: { color: GH.text, fontWeight: '600' },
  emptyText: { color: GH.muted, fontSize: 15 },
  listContent: { padding: 16 },
  timelineRow: { flexDirection: 'row', marginBottom: 12 },
  timelineStem: { alignItems: 'center', width: 24, marginRight: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: GH.border, marginTop: 12, zIndex: 1 },
  dotActive: { backgroundColor: GH.greenBright, width: 14, height: 14, borderRadius: 7 },
  line: { width: 2, flex: 1, backgroundColor: GH.border, marginTop: -6, marginBottom: -12 },
  card: { flex: 1, backgroundColor: GH.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: GH.border },
  cardActive: { borderColor: GH.green, backgroundColor: '#0e2617' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  valueText: { fontSize: 22, fontWeight: '800', color: GH.text },
  valueTextActive: { color: GH.greenBright },
  badge: { fontSize: 10, fontWeight: '800', color: '#fff', backgroundColor: GH.green, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  dateText: { fontSize: 13, color: GH.muted },
});
