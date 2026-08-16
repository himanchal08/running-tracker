import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { exportData, importData } from '../features/settings/dataManager';

const GH = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  muted: '#8b949e',
  blue: '#58a6ff',
  red: '#f85149',
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Data Management</Text>
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
    </View>
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
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: GH.text },
  headerBtn: { padding: 8, marginLeft: -8 },
  headerBtnText: { color: GH.blue, fontSize: 16 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: GH.muted, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: GH.surface, borderRadius: 10, borderWidth: 1, borderColor: GH.border, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  rowText: { fontSize: 16, color: GH.text, fontWeight: '500' },
  rowTextDestructive: { fontSize: 16, color: GH.red, fontWeight: '500' },
  chevron: { fontSize: 20, color: GH.muted, lineHeight: 20 },
  divider: { height: 1, backgroundColor: GH.border, marginLeft: 16 },
  footerText: { fontSize: 13, color: GH.muted, marginTop: 12, marginHorizontal: 4, lineHeight: 18 },
});
