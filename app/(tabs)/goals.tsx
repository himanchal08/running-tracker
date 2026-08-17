import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getDb } from '../../db/client';
import { listActiveGoals, addGoal, deactivateGoal } from '../../db/queries/goals';
import { listPRs } from '../../db/queries/personalRecords';
import { getCurrentStreak } from '../../db/queries/activities';
import { computeGoalsProgress, type GoalProgress } from '../../features/goals/goalEngine';
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

function ProgressBar({ pct, isCompleted }: { pct: number, isCompleted: boolean }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: isCompleted ? GH.yellow : GH.greenBright }]} />
    </View>
  );
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeGoals, setActiveGoals] = useState<GoalProgress[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [streak, setStreak] = useState({ current: 0, isAliveToday: false });

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [customMetric, setCustomMetric] = useState<'distance' | 'time' | 'elevation' | 'activities'>('distance');
  const [customPeriod, setCustomPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [customTarget, setCustomTarget] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const goals = await listActiveGoals(db);
      const progress = await computeGoalsProgress(db, goals);
      const records = await listPRs(db);
      const currentStreak = await getCurrentStreak(db);

      setActiveGoals(progress);
      setPrs(records);
      setStreak(currentStreak);
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

  const handleSaveCustomGoal = async () => {
    const target = parseFloat(customTarget);
    if (isNaN(target) || target <= 0) {
      Alert.alert('Invalid target', 'Please enter a valid target value.');
      return;
    }
    let finalTarget = target;
    if (customMetric === 'distance') finalTarget = target * 1000; // km to meters
    if (customMetric === 'time') finalTarget = target * 3600; // hours to seconds
    
    await handleAddGoal(customMetric, customPeriod, finalTarget);
    setModalVisible(false);
    setCustomTarget('');
  };

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GH.greenBright} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Goals</Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>{streak.isAliveToday || streak.current > 0 ? '🔥' : '🧊'}</Text>
            <Text style={[styles.streakNumber, streak.isAliveToday && { color: '#ff9800' }]}>{streak.current}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Goals</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Custom</Text>
          </TouchableOpacity>
        </View>

        {activeGoals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>🎯</Text>
            <Text style={styles.emptyStateTitle}>No Active Goals</Text>
            <Text style={styles.emptyStateSubtitle}>
              Did you know? Setting a specific goal increases your chance of running consistently by over 80%. Let's set a target!
            </Text>
            <TouchableOpacity style={styles.emptyStateBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.emptyStateBtnText}>Create Your First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeGoals.map((gp) => (
            <TouchableOpacity
              key={gp.goal.id}
              style={[styles.goalCard, gp.isCompleted && styles.goalCardCompleted]}
              onLongPress={() => handleRemoveGoal(gp.goal.id)}
              delayLongPress={500}
              accessibilityRole="button"
              accessibilityLabel={`Goal: ${gp.goal.period} ${gp.goal.metric}. ${gp.progressPct}% complete`}
            >
              <View style={styles.goalTopRow}>
                <Text style={[styles.goalTitle, gp.isCompleted && { color: GH.yellow }]}>
                  {gp.goal.period === 'day' ? 'Daily' : gp.goal.period === 'week' ? 'Weekly' : 'Monthly'} {gp.goal.metric}
                  {gp.isCompleted ? ' 🏆' : ''}
                </Text>
                <Text style={[styles.goalPct, gp.isCompleted && { color: GH.yellow }]}>{gp.progressPct}%</Text>
              </View>
              <Text style={styles.goalLabel}>{gp.label}</Text>
              <ProgressBar pct={gp.progressPct} isCompleted={gp.isCompleted} />
            </TouchableOpacity>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 32, marginBottom: 12 }]}>Quick Templates</Text>
        <View style={styles.templatesContainer}>
          <TouchableOpacity style={styles.templateBtn} onPress={() => handleAddGoal('distance', 'week', 20000)}>
            <Text style={styles.templateText}>🏃 20km Weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.templateBtn} onPress={() => handleAddGoal('time', 'week', 3600 * 3)}>
            <Text style={styles.templateText}>⏱️ 3h Weekly Time</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.templateBtn} onPress={() => handleAddGoal('elevation', 'month', 500)}>
            <Text style={styles.templateText}>🏔️ 500m Monthly Climb</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.templateBtn} onPress={() => handleAddGoal('activities', 'month', 15)}>
            <Text style={styles.templateText}>🔥 15 Activities / Month</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionHeader, { marginTop: 40 }]}>
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

      {/* Custom Goal Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Custom Goal</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Metric</Text>
            <View style={styles.segmentedControl}>
              {(['distance', 'time', 'elevation', 'activities'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.segmentBtn, customMetric === m && styles.segmentBtnActive]}
                  onPress={() => setCustomMetric(m)}
                >
                  <Text style={[styles.segmentText, customMetric === m && styles.segmentTextActive]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Time Period</Text>
            <View style={styles.segmentedControl}>
              {(['day', 'week', 'month'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.segmentBtn, customPeriod === p && styles.segmentBtnActive]}
                  onPress={() => setCustomPeriod(p)}
                >
                  <Text style={[styles.segmentText, customPeriod === p && styles.segmentTextActive]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>
              Target Value {customMetric === 'distance' ? '(km)' : customMetric === 'time' ? '(hours)' : customMetric === 'elevation' ? '(meters)' : '(count)'}
            </Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder={customMetric === 'distance' ? 'e.g. 10' : customMetric === 'time' ? 'e.g. 5' : 'e.g. 100'}
              placeholderTextColor={GH.muted}
              value={customTarget}
              onChangeText={setCustomTarget}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCustomGoal}>
              <Text style={styles.saveBtnText}>Save Goal</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GH.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: GH.text, letterSpacing: -0.5 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1917', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#431407' },
  streakEmoji: { fontSize: 16, marginRight: 4 },
  streakNumber: { fontSize: 16, fontWeight: '800', color: GH.muted },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: GH.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  addBtn: { backgroundColor: GH.greenFaint, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: GH.green },
  addBtnText: { color: GH.greenBright, fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: GH.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  emptyState: { backgroundColor: GH.surface, padding: 24, borderRadius: 12, borderWidth: 1, borderColor: GH.border, alignItems: 'center' },
  emptyStateEmoji: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: GH.text, marginBottom: 8 },
  emptyStateSubtitle: { fontSize: 14, color: GH.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyStateBtn: { backgroundColor: GH.blue, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  emptyStateBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  emptyCard: { backgroundColor: GH.surface, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: GH.border },
  emptyText: { color: GH.muted, fontSize: 14, textAlign: 'center' },
  goalCard: {
    backgroundColor: GH.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GH.border,
    marginBottom: 12,
  },
  goalCardCompleted: {
    backgroundColor: '#1f1a0a',
    borderColor: GH.yellow,
  },
  goalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: GH.text, textTransform: 'capitalize' },
  goalPct: { fontSize: 15, fontWeight: '700', color: GH.greenBright },
  goalLabel: { fontSize: 13, color: GH.muted, marginBottom: 12 },
  templatesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  templateBtn: { backgroundColor: GH.surface, borderWidth: 1, borderColor: GH.border, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  templateText: { color: GH.text, fontSize: 13, fontWeight: '600' },
  prGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#2e1f00',
    borderWidth: 1,
    borderColor: GH.yellow,
    padding: 16,
    borderRadius: 12,
  },
  prLabel: { fontSize: 11, color: '#e3b341', fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  prValue: { fontSize: 22, color: GH.yellow, fontWeight: '800', fontVariant: ['tabular-nums'], marginBottom: 4 },
  prDate: { fontSize: 12, color: GH.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: GH.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: GH.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: GH.text },
  modalCloseBtn: { fontSize: 24, color: GH.muted, fontWeight: 'bold' },
  formLabel: { fontSize: 13, fontWeight: '700', color: GH.text, marginBottom: 8, textTransform: 'uppercase' },
  segmentedControl: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  segmentBtn: { flex: 1, minWidth: '30%', backgroundColor: GH.surface, paddingVertical: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: GH.border },
  segmentBtnActive: { backgroundColor: GH.greenFaint, borderColor: GH.green },
  segmentText: { color: GH.muted, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: GH.greenBright, fontWeight: '700' },
  textInput: { backgroundColor: GH.surface, borderWidth: 1, borderColor: GH.border, color: GH.text, fontSize: 18, padding: 16, borderRadius: 8, marginBottom: 32 },
  saveBtn: { backgroundColor: GH.greenBright, padding: 16, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
