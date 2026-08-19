import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { exportData, importData } from '../features/settings/dataManager';
import { getBodyWeightKg, setBodyWeightKg } from '../features/settings/userProfile';
import { useRecordingStore } from '../store/recordingStore';

import { M, RADIUS } from '../constants/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightSaved, setWeightSaved] = useState(false);

  useEffect(() => {
    getBodyWeightKg().then((kg) => {
      setWeightInput(String(kg));
    });
  }, []);

  const handleSaveWeight = async () => {
    const kg = parseFloat(weightInput);
    if (!isFinite(kg) || kg <= 0 || kg > 300) {
      Alert.alert('Invalid weight', 'Please enter a value between 1 and 300 kg.');
      return;
    }
    await setBodyWeightKg(kg);
    setWeightSaved(true);
    setTimeout(() => setWeightSaved(false), 2000);
  };

  const handleExport = async () => {
    setLoading(true);
    const success = await exportData();
    setLoading(false);
    if (!success) {
      Alert.alert('Export Failed', 'Could not export your data.');
    }
  };

  const handleImport = async () => {
    // FALLBACK: Never allow import if an activity is actively being tracked.
    const isRecording = useRecordingStore.getState().status === 'recording' || useRecordingStore.getState().status === 'paused';
    if (isRecording) {
      Alert.alert('Cannot Import', 'Please stop and save your current activity before importing a database.');
      return;
    }

    Alert.alert(
      'Warning: Overwrite Data',
      'Importing a backup will completely overwrite your current database. This cannot be undone. Do you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const success = await importData();
            setLoading(false);
            if (success) {
              Alert.alert('Restored', 'Backup restored successfully.', [
                { text: 'View History', onPress: () => router.replace('/(tabs)/history' as any) }
              ]);
            } else {
              Alert.alert('Import Failed', 'Could not restore backup. Your existing data is unchanged.');
            }
          }
        }
      ]
    );
  };


  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.container]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.content}>
          {/* Profile section */}
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>Body weight</Text>
                <Text style={styles.rowSubText}>
                  Used to calculate accurate calorie burn during activities.
                </Text>
              </View>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={styles.weightInput}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveWeight}
                  accessibilityLabel="Body weight in kilograms"
                  placeholderTextColor={M.textSecondary}
                  placeholder="70"
                />
                <Text style={styles.weightUnit}>kg</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.saveWeightBtn, weightSaved && styles.saveWeightBtnSaved]}
              onPress={handleSaveWeight}
              accessibilityRole="button"
            >
              <Text style={[styles.saveWeightBtnText, weightSaved && styles.saveWeightBtnTextSaved]}>
                {weightSaved ? '✓ Saved' : 'Save Weight'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>
            Default is 70 kg. This affects calorie estimates only and is stored locally on your device.
          </Text>

          {/* Data section */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Data Management</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleExport} disabled={loading}>
              <Text style={styles.rowText}>Export Database Backup</Text>
              {loading ? <ActivityIndicator size="small" color={M.blue} /> : <Text style={styles.chevron}>›</Text>}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row} onPress={handleImport} disabled={loading}>
              <Text style={styles.rowTextDestructive}>Import Database Backup</Text>
              {loading ? <ActivityIndicator size="small" color={M.danger} /> : <Text style={styles.chevron}>›</Text>}
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>
            Exporting saves your entire history, routes, and milestones into a .db file that you can save to Google Drive or email to yourself.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: M.bg,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: M.textPrimary, letterSpacing: -0.5 },
  headerBtn: { padding: 8, marginLeft: -8 },
  headerBtnText: { color: M.textSecondary, fontSize: 16 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: M.textSecondary, textTransform: 'uppercase', marginBottom: 12, marginLeft: 4, letterSpacing: 0.5 },
  card: { backgroundColor: M.surface, borderRadius: RADIUS.card, borderWidth: 1, borderColor: M.borderFaint, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  rowText: { fontSize: 15, color: M.textPrimary, fontWeight: '500' },
  rowSubText: { fontSize: 13, color: M.textSecondary, marginTop: 4, lineHeight: 18 },
  rowTextDestructive: { fontSize: 15, color: M.danger, fontWeight: '500' },
  chevron: { fontSize: 20, color: M.textSecondary, lineHeight: 20 },
  divider: { height: 1, backgroundColor: M.borderFaint, marginLeft: 20 },
  footerText: { fontSize: 13, color: M.textSecondary, marginTop: 12, marginHorizontal: 4, lineHeight: 20, fontStyle: 'italic' },
  weightInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weightInput: {
    backgroundColor: M.bg,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: RADIUS.md,
    color: M.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 70,
    textAlign: 'center',
  },
  weightUnit: { color: M.textSecondary, fontSize: 14, fontWeight: '600' },
  saveWeightBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: M.tealBorder,
    alignItems: 'center',
    backgroundColor: M.tealFaint,
  },
  saveWeightBtnSaved: {
    borderColor: M.teal,
    backgroundColor: M.teal,
  },
  saveWeightBtnText: { fontSize: 14, fontWeight: '700', color: M.teal },
  saveWeightBtnTextSaved: { color: M.bg },
});
