import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { M, RADIUS } from '../../constants/theme';
import { getDb } from '../../db/client';
import { listActiveGoals, addGoal, deactivateGoal } from '../../db/queries/goals';
import { listPRs } from '../../db/queries/personalRecords';
import { getCurrentStreak } from '../../db/queries/activities';
import { computeGoalsProgress, type GoalProgress } from '../../features/goals/goalEngine';
import type { PersonalRecord, Goal } from '../../db/schema';
import { PR_LABELS, type PRCategory } from '../../features/analysis/personalRecords';
import { formatDistance, formatDuration } from '../../features/tracking/utils/formatters';

function formatPrValue(category: string, value: number): string {
  if (category.startsWith('fastest_')) return formatDuration(value);
  if (category.startsWith('furthest_')) return formatDistance(value);
  if (category === 'longest_activity_s') return formatDuration(value);
  return String(Math.round(value));
}

function ProgressBar({ pct, isCompleted }: { pct: number; isCompleted: boolean }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.min(pct, 100)}%` },
          isCompleted ? { backgroundColor: M.amber } : { backgroundColor: M.teal },
        ]}
      />
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
        <ActivityIndicator size="large" color={M.teal} />
      </View>
    );
  }

  const [fontsLoaded] = useFonts({ PlayfairDisplay_700Bold });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}>Goals</Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>{streak.isAliveToday || streak.current > 0 ? '🔥' : '🧊'}</Text>
            <Text style={[styles.streakNumber, streak.isAliveToday && { color: M.amber }]}>{streak.current}</Text>
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
                <Text style={[styles.goalTitle, gp.isCompleted && { color: M.amber }]}>
                  {gp.goal.period === 'day' ? 'Daily' : gp.goal.period === 'week' ? 'Weekly' : 'Monthly'} {gp.goal.metric}
                  {gp.isCompleted ? ' 🏆' : ''}
                </Text>
                <Text style={[styles.goalPct, gp.isCompleted && { color: M.amber }]}>{gp.progressPct}%</Text>
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
              <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}>New Pursuit</Text>
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
              style={[styles.textInput, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}
              keyboardType="numeric"
              placeholder={customMetric === 'distance' ? 'e.g. 10' : customMetric === 'time' ? 'e.g. 5' : 'e.g. 100'}
              placeholderTextColor={M.textSecondary}
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
  screen: { flex: 1, backgroundColor: M.bgAlt },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: M.bgAlt },
  content: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: M.textPrimary, letterSpacing: -0.5 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: M.surfaceBright, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: M.borderSubtle },
  streakEmoji: { fontSize: 14, marginRight: 6 },
  streakNumber: { fontSize: 14, fontWeight: '600', color: M.textPrimary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: M.textSecondary, textTransform: 'uppercase', letterSpacing: 0.1 },
  addBtn: { backgroundColor: M.tealFaint, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: M.tealBorder },
  addBtnText: { color: M.teal, fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 8, backgroundColor: M.cardMid, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  emptyState: { backgroundColor: M.card, padding: 32, borderRadius: RADIUS.card, borderWidth: 1, borderColor: M.border, alignItems: 'center' },
  emptyStateEmoji: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: M.textPrimary, marginBottom: 12 },
  emptyStateSubtitle: { fontSize: 14, color: M.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyStateBtn: { backgroundColor: M.teal, paddingHorizontal: 24, paddingVertical: 14, borderRadius: RADIUS.pill },
  emptyStateBtnText: { color: M.bg, fontWeight: '700', fontSize: 14 },
  emptyCard: { backgroundColor: M.surface, padding: 24, borderRadius: RADIUS.card, borderWidth: 1, borderColor: M.borderFaint },
  emptyText: { color: M.textSecondary, fontSize: 14, textAlign: 'center' },
  goalCard: {
    backgroundColor: M.surface,
    padding: 20,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: M.borderFaint,
    marginBottom: 16,
  },
  goalCardCompleted: {
    backgroundColor: 'rgba(245,158,11,0.05)',
    borderColor: M.amberBorder,
  },
  goalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  goalTitle: { fontSize: 15, fontWeight: '600', color: M.textPrimary },
  goalPct: { fontSize: 15, fontWeight: '700', color: M.teal },
  goalLabel: { fontSize: 13, color: M.textSecondary, marginBottom: 16 },
  templatesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  templateBtn: { backgroundColor: M.surface, borderWidth: 1, borderColor: M.borderFaint, paddingVertical: 14, paddingHorizontal: 16, borderRadius: RADIUS.card },
  templateText: { color: M.textPrimary, fontSize: 13, fontWeight: '500' },
  prGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  prTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(245,158,11,0.05)',
    borderWidth: 1,
    borderColor: M.amberBorder,
    padding: 20,
    borderRadius: RADIUS.card,
  },
  prLabel: { fontSize: 10, color: M.amber, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.05 },
  prValue: { fontSize: 24, color: M.textPrimary, fontWeight: '700', fontVariant: ['tabular-nums'], marginBottom: 6, fontFamily: 'PlayfairDisplay_700Bold' },
  prDate: { fontSize: 11, color: M.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(7,6,15,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'rgba(21,20,36,0.95)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48, borderWidth: 1, borderColor: M.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: M.textPrimary },
  modalCloseBtn: { fontSize: 24, color: M.textSecondary, fontWeight: '400' },
  formLabel: { fontSize: 11, fontWeight: '600', color: M.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.1 },
  segmentedControl: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  segmentBtn: { flex: 1, minWidth: '30%', backgroundColor: M.surfaceBright, paddingVertical: 14, alignItems: 'center', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'transparent' },
  segmentBtnActive: { backgroundColor: M.cardMid, borderColor: M.teal },
  segmentText: { color: M.textSecondary, fontSize: 13, fontWeight: '500' },
  segmentTextActive: { color: M.textPrimary, fontWeight: '600' },
  textInput: { backgroundColor: M.surfaceBright, borderWidth: 1, borderColor: 'transparent', color: M.textPrimary, fontSize: 24, padding: 20, borderRadius: RADIUS.xl, marginBottom: 40 },
  saveBtn: { backgroundColor: M.teal, padding: 18, borderRadius: RADIUS.pill, alignItems: 'center', shadowColor: M.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  saveBtnText: { color: M.bg, fontSize: 16, fontWeight: '700' },
});
