import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { exportData, importData } from '../features/settings/dataManager';
import { getBodyWeightKg, setBodyWeightKg } from '../features/settings/userProfile';

const GH = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  muted: '#8b949e',
  blue: '#58a6ff',
  green: '#2ea043',
  greenBright: '#3fb950',
  red: '#f85149',
};

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
              Alert.alert('Success', 'Backup restored successfully. Please restart the app for changes to take effect.', [
                { text: 'OK', onPress: () => router.push('/(tabs)' as any) }
              ]);
            } else {
              Alert.alert('Import Failed', 'Could not restore backup.');
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
                  placeholderTextColor={GH.muted}
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
              {loading ? <ActivityIndicator size="small" color={GH.blue} /> : <Text style={styles.chevron}>›</Text>}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row} onPress={handleImport} disabled={loading}>
              <Text style={styles.rowTextDestructive}>Import Database Backup</Text>
              {loading ? <ActivityIndicator size="small" color={GH.red} /> : <Text style={styles.chevron}>›</Text>}
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
  container: { flex: 1, backgroundColor: GH.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GH.border,
    backgroundColor: GH.bg,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: GH.text },
  headerBtn: { padding: 8, marginLeft: -8 },
  headerBtnText: { color: GH.blue, fontSize: 16 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: GH.muted, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4, letterSpacing: 0.6 },
  card: { backgroundColor: GH.surface, borderRadius: 10, borderWidth: 1, borderColor: GH.border, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowText: { fontSize: 16, color: GH.text, fontWeight: '500' },
  rowSubText: { fontSize: 12, color: GH.muted, marginTop: 2, lineHeight: 16 },
  rowTextDestructive: { fontSize: 16, color: GH.red, fontWeight: '500' },
  chevron: { fontSize: 20, color: GH.muted, lineHeight: 20 },
  divider: { height: 1, backgroundColor: GH.border, marginLeft: 16 },
  footerText: { fontSize: 13, color: GH.muted, marginTop: 10, marginHorizontal: 4, lineHeight: 18 },
  weightInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weightInput: {
    backgroundColor: GH.bg,
    borderWidth: 1,
    borderColor: GH.border,
    borderRadius: 8,
    color: GH.text,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 64,
    textAlign: 'center',
  },
  weightUnit: { color: GH.muted, fontSize: 14, fontWeight: '600' },
  saveWeightBtn: {
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GH.green,
    alignItems: 'center',
    backgroundColor: '#0d2a0d',
  },
  saveWeightBtnSaved: {
    borderColor: GH.greenBright,
    backgroundColor: '#0d4a1f',
  },
  saveWeightBtnText: { fontSize: 14, fontWeight: '700', color: GH.greenBright },
  saveWeightBtnTextSaved: { color: '#ffffff' },
});
