import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getDb } from '../../db/client';
import { listActiveGoals, addGoal, deactivateGoal } from '../../db/queries/goals';
import { listPRs } from '../../db/queries/personalRecords';
import { computeGoalsProgress, type GoalProgress } from '../../features/goals/goalEngine';
import { getDailyMetric } from '../../db/queries/dailyMetrics';
import type { PersonalRecord, Goal } from '../../db/schema';
import { PR_LABELS, type PRCategory } from '../../features/analysis/personalRecords';
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
  yellow: '#d29922',
  red: '#f85149',
};

function formatPrValue(category: string, value: number): string {
  if (category.startsWith('fastest_')) return formatDuration(value);
  if (category.startsWith('furthest_')) return formatDistance(value);
  if (category === 'longest_activity_s') return formatDuration(value);
  return String(Math.round(value));
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, pct))}%` }]} />
    </View>
  );
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeGoals, setActiveGoals] = useState<GoalProgress[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [dailySteps, setDailySteps] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const goals = await listActiveGoals(db);
      const progress = await computeGoalsProgress(db, goals);
      const records = await listPRs(db);
      const todayStr = new Date().toISOString().slice(0, 10);
      const metric = await getDailyMetric(db, todayStr);

      setActiveGoals(progress);
      setPrs(records);
      setDailySteps(metric?.steps ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddGoal = useCallback(
    async (metric: string, period: 'day' | 'week' | 'month', targetValue: number) => {
      try {
        const db = getDb();
        const todayStr = new Date().toISOString().slice(0, 10);
        await addGoal(db, { metric, period, targetValue, startDate: todayStr });
        loadData();
      } catch (err) {
        console.error('Failed to add goal:', err);
      }
    },
    [loadData],
  );

  const handleRemoveGoal = useCallback(
    (id: number) => {
      Alert.alert('Remove Goal?', 'Are you sure you want to delete this goal?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const db = getDb();
            await deactivateGoal(db, id);
            loadData();
          },
        },
      ]);
    },
    [loadData],
  );

  const stepsGoal = 10000;
  const stepsPct = Math.round((dailySteps / stepsGoal) * 100);

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
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 16 }]}
    >
      <Text style={styles.pageTitle}>Goals & Habits</Text>

      <View style={styles.dailyCard}>
        <Text style={styles.dailyTitle}>Daily Steps</Text>
        <Text style={styles.dailyValue}>{dailySteps.toLocaleString()} <Text style={styles.dailyTarget}>/ {stepsGoal.toLocaleString()}</Text></Text>
        <ProgressBar pct={stepsPct} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Goals</Text>
      </View>

      {activeGoals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>You don't have any active goals.</Text>
        </View>
      ) : (
        activeGoals.map((gp) => (
          <TouchableOpacity
            key={gp.goal.id}
            style={styles.goalCard}
            onLongPress={() => handleRemoveGoal(gp.goal.id)}
            delayLongPress={500}
            accessibilityRole="button"
            accessibilityLabel={`Goal: ${gp.goal.period} ${gp.goal.metric}. ${gp.progressPct}% complete`}
          >
            <View style={styles.goalTopRow}>
              <Text style={styles.goalTitle}>
                {gp.goal.period === 'day' ? 'Daily' : gp.goal.period === 'week' ? 'Weekly' : 'Monthly'} {gp.goal.metric}
              </Text>
              <Text style={styles.goalPct}>{gp.progressPct}%</Text>
            </View>
            <Text style={styles.goalLabel}>{gp.label}</Text>
            <ProgressBar pct={gp.progressPct} />
          </TouchableOpacity>
        ))
      )}

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Start a Goal</Text>
      <View style={styles.templatesContainer}>
        <TouchableOpacity style={styles.templateBtn} onPress={() => handleAddGoal('distance', 'week', 20000)}>
          <Text style={styles.templateText}>+ 20km Weekly Distance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.templateBtn} onPress={() => handleAddGoal('time', 'week', 3600 * 3)}>
          <Text style={styles.templateText}>+ 3h Weekly Active Time</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.templateBtn} onPress={() => handleAddGoal('steps', 'month', 300000)}>
          <Text style={styles.templateText}>+ 300k Monthly Steps</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.sectionHeader, { marginTop: 32 }]}>
        <Text style={styles.sectionTitle}>Personal Records</Text>
      </View>

      {prs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No personal records yet. Go set some benchmarks!</Text>
        </View>
      ) : (
        <View style={styles.prGrid}>
          {prs.map((pr) => {
            const label = PR_LABELS[pr.category as PRCategory] ?? pr.category;
            const dateStr = new Date(pr.achievedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            return (
              <TouchableOpacity
                key={pr.id}
                style={styles.prTile}
                onPress={() => {
                  router.push(`/pr-history?category=${pr.category}` as any);
                }}
              >
                <Text style={styles.prLabel}>{label}</Text>
                <Text style={styles.prValue}>{formatPrValue(pr.category, pr.value)}</Text>
                <Text style={styles.prDate}>{dateStr}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GH.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: GH.text, marginBottom: 24, letterSpacing: -0.5 },
  sectionHeader: { marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: GH.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  dailyCard: {
    backgroundColor: '#0d1f17',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: GH.green,
    marginBottom: 24,
  },
  dailyTitle: { fontSize: 13, color: GH.greenBright, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  dailyValue: { fontSize: 32, fontWeight: '800', color: GH.text, marginBottom: 12 },
  dailyTarget: { fontSize: 16, color: GH.muted, fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: GH.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: GH.greenBright, borderRadius: 3 },
  emptyCard: { backgroundColor: GH.surface, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: GH.border },
  emptyText: { color: GH.muted, fontSize: 14, textAlign: 'center' },
  goalCard: {
    backgroundColor: GH.surface,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GH.border,
    marginBottom: 10,
  },
  goalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: GH.text },
  goalPct: { fontSize: 15, fontWeight: '700', color: GH.greenBright },
  goalLabel: { fontSize: 13, color: GH.muted, marginBottom: 12 },
  templatesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateBtn: { backgroundColor: GH.surface, borderWidth: 1, borderColor: GH.border, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  templateText: { color: GH.blue, fontSize: 13, fontWeight: '600' },
  prGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#2e1f00',
    borderWidth: 1,
    borderColor: GH.yellow,
    padding: 14,
    borderRadius: 10,
  },
  prLabel: { fontSize: 11, color: '#e3b341', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  prValue: { fontSize: 20, color: GH.yellow, fontWeight: '800', fontVariant: ['tabular-nums'], marginBottom: 4 },
  prDate: { fontSize: 12, color: GH.muted },
});
