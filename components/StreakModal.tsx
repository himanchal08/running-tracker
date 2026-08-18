import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { M, RADIUS } from '../constants/theme';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';

export const STREAK_TIERS = [
  { days: 3, name: 'Spark', icon: '✨' },
  { days: 7, name: 'Flame', icon: '🔥' },
  { days: 14, name: 'Blaze', icon: '☄️' },
  { days: 30, name: 'Inferno', icon: '🌋' },
  { days: 100, name: 'Wildfire', icon: '🐉' },
  { days: 365, name: 'Supernova', icon: '🌟' },
];

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
  currentStreak: number;
  isAliveToday: boolean;
}

export function StreakModal({ visible, onClose, currentStreak, isAliveToday }: StreakModalProps) {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_700Bold });

  const currentTierIndex = STREAK_TIERS.findLastIndex((t) => currentStreak >= t.days);
  const currentTier = currentTierIndex >= 0 ? STREAK_TIERS[currentTierIndex] : null;
  const nextTier = STREAK_TIERS.find((t) => currentStreak < t.days) || STREAK_TIERS[STREAK_TIERS.length - 1];

  const prevTierDays = currentTier ? currentTier.days : 0;
  const targetDays = nextTier.days;
  const progressToNext = Math.max(0, currentStreak - prevTierDays);
  const requiredForNext = targetDays - prevTierDays;
  const pct = Math.min(100, (progressToNext / requiredForNext) * 100);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.mainEmoji}>{isAliveToday || currentStreak > 0 ? (currentTier?.icon || '🔥') : '🧊'}</Text>
            <Text style={[styles.title, fontsLoaded && { fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {currentStreak} Day Streak
            </Text>
            <Text style={styles.subtitle}>
              {currentTier ? `You've reached ${currentTier.name} rank!` : "Keep running to unlock your first rank."}
            </Text>
          </View>

          {currentStreak < STREAK_TIERS[STREAK_TIERS.length - 1].days && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Next Rank: {nextTier.name} {nextTier.icon}</Text>
                <Text style={styles.progressValue}>{currentStreak} / {nextTier.days}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.daysLeftText}>
                Just {targetDays - currentStreak} more day{targetDays - currentStreak === 1 ? '' : 's'}!
              </Text>
            </View>
          )}

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {STREAK_TIERS.map((tier) => {
              const achieved = currentStreak >= tier.days;
              const isNext = nextTier.days === tier.days && !achieved;

              return (
                <View key={tier.days} style={[styles.tierCard, achieved && styles.tierCardAchieved, isNext && styles.tierCardNext]}>
                  <View style={styles.tierIconContainer}>
                    <Text style={[styles.tierIcon, !achieved && styles.tierIconLocked]}>
                      {achieved ? tier.icon : '🔒'}
                    </Text>
                  </View>
                  <View style={styles.tierInfo}>
                    <Text style={[styles.tierName, achieved && styles.tierNameAchieved]}>{tier.name}</Text>
                    <Text style={[styles.tierDays, achieved && styles.tierDaysAchieved]}>{tier.days} Days</Text>
                  </View>
                  {achieved && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: M.bgAlt,
    borderTopLeftRadius: RADIUS.card * 1.5,
    borderTopRightRadius: RADIUS.card * 1.5,
    height: '85%',
    padding: 24,
    paddingTop: 32,
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: M.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: M.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    color: M.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: M.textSecondary,
    textAlign: 'center',
  },
  progressSection: {
    backgroundColor: M.surface,
    padding: 16,
    borderRadius: RADIUS.card,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: M.borderFaint,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    color: M.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  progressValue: {
    color: M.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    backgroundColor: M.bgAlt,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: M.amber,
    borderRadius: 4,
  },
  daysLeftText: {
    color: M.amber,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: M.surface,
    borderRadius: RADIUS.card,
    marginBottom: 12,
    opacity: 0.6,
  },
  tierCardAchieved: {
    opacity: 1,
    borderWidth: 1,
    borderColor: M.amber + '40', // 25% opacity amber
    backgroundColor: M.amber + '10',
  },
  tierCardNext: {
    opacity: 0.9,
    borderWidth: 1,
    borderColor: M.borderFaint,
    borderStyle: 'dashed',
  },
  tierIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: M.bgAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  tierIcon: {
    fontSize: 24,
  },
  tierIconLocked: {
    opacity: 0.5,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 16,
    fontWeight: '700',
    color: M.textSecondary,
    marginBottom: 4,
  },
  tierNameAchieved: {
    color: M.amber,
  },
  tierDays: {
    fontSize: 13,
    color: M.textSecondary,
  },
  tierDaysAchieved: {
    color: M.textPrimary,
  },
  checkMark: {
    fontSize: 20,
    color: M.amber,
    fontWeight: '800',
  },
});
