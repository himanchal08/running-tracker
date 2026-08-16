import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../../db/client';
import { listPRs } from '../../db/queries/personalRecords';
import type { PersonalRecord } from '../../db/schema';
import { PR_LABELS, type PRCategory } from '../../features/analysis/personalRecords';
import { formatDistance, formatDuration, formatActivityDate } from '../../features/tracking/utils/formatters';

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
  yellow: '#d29922',
  yellowFaint: '#2e1f00',
};

const PR_EMOJIS: Record<PRCategory, string> = {
  fastest_1k:       '⚡',
  fastest_3k:       '🏃',
  fastest_5k:       '🏃',
  fastest_10k:      '🏅',
  fastest_half:     '🥈',
  fastest_marathon: '🥇',
  fastest_30min:    '⏱️',
  fastest_60min:    '⏱️',
  longest_activity: '📏',
  most_elevation:   '⛰️',
};

function formatPRValue(category: PRCategory, value: number): string {
  if (
    category === 'fastest_1k' ||
    category === 'fastest_3k' ||
    category === 'fastest_5k' ||
    category === 'fastest_10k' ||
    category === 'fastest_half' ||
    category === 'fastest_marathon'
  ) {
    return formatDuration(value);
  }
  if (category === 'fastest_30min' || category === 'fastest_60min') {
    return formatDistance(value);
  }
  if (category === 'longest_activity') {
    return formatDistance(value);
  }
  if (category === 'most_elevation') {
    return `+${Math.round(value)} m`;
  }
  return String(value);
}

function getPRSubLabel(category: PRCategory): string {
  if (
    category === 'fastest_1k' ||
    category === 'fastest_3k' ||
    category === 'fastest_5k' ||
    category === 'fastest_10k' ||
    category === 'fastest_half' ||
    category === 'fastest_marathon'
  ) {
    return 'Best time';
  }
  if (category === 'fastest_30min') return 'In 30 minutes';
  if (category === 'fastest_60min') return 'In 60 minutes';
  if (category === 'longest_activity') return 'Single activity';
  if (category === 'most_elevation') return 'Elevation gain';
  return '';
}

function PRCard({ pr, onPress }: { pr: PersonalRecord; onPress: () => void }) {
  const category = pr.category as PRCategory;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${PR_LABELS[category] ?? category}: ${formatPRValue(category, pr.value)}`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{PR_EMOJIS[category] ?? '🏆'}</Text>
        <View style={styles.trophyBadge}>
          <Text style={styles.trophyBadgeText}>PR</Text>
        </View>
      </View>
      <Text style={styles.cardValue}>{formatPRValue(category, pr.value)}</Text>
      <Text style={styles.cardSubLabel}>{getPRSubLabel(category)}</Text>
      <Text style={styles.cardCategory}>{PR_LABELS[category] ?? category}</Text>
      <Text style={styles.cardDate}>
        {formatActivityDate(pr.achievedAt)}
      </Text>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🏆</Text>
      <Text style={styles.emptyTitle}>No records yet</Text>
      <Text style={styles.emptySubtitle}>
        Complete activities to set your first personal records. Records are detected automatically.
      </Text>
    </View>
  );
}

export default function RecordsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPRs = useCallback(async () => {
    try {
      const db = getDb();
      const rows = await listPRs(db);
      setPrs(rows);
    } catch (err) {
      console.error('[RecordsScreen] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPRs();
  }, [loadPRs]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GH.greenBright} />
      </View>
    );
  }

  if (prs.length === 0) {
    return <EmptyState />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Text style={styles.pageSubtitle}>
        {prs.length} personal {prs.length === 1 ? 'record' : 'records'} across all activities
      </Text>

      <View style={styles.grid}>
        {prs.map((pr) => (
          <PRCard
            key={pr.id}
            pr={pr}
            onPress={() => {
              if (pr.activityId) {
                router.push(`/activity/${pr.activityId}`);
              }
            }}
          />
        ))}
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
  pageSubtitle: {
    fontSize: 13,
    color: GH.muted,
    marginBottom: 16,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47%',
    backgroundColor: GH.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GH.border,
    padding: 14,
    gap: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardEmoji: { fontSize: 24 },
  trophyBadge: {
    backgroundColor: GH.yellowFaint,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: GH.yellow,
  },
  trophyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: GH.yellow,
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: GH.text,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  cardSubLabel: {
    fontSize: 10,
    color: GH.muted,
    fontWeight: '500',
    marginBottom: 6,
  },
  cardCategory: {
    fontSize: 12,
    color: GH.text,
    fontWeight: '600',
    flexShrink: 1,
  },
  cardDate: {
    fontSize: 11,
    color: GH.muted,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GH.bg,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
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
});
