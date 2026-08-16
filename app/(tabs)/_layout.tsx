import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

function HistoryIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconContainer}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.iconLine, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function RecordIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={[styles.recordIconOuter, focused && styles.recordIconOuterFocused]}>
      <View style={[styles.recordIconInner, { backgroundColor: color }]} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF4D00',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: '#111827',
      }}
    >
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <HistoryIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ color, focused }) => (
            <RecordIcon color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    height: 64,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  header: {
    backgroundColor: '#FFFFFF',
    shadowColor: 'transparent',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  iconContainer: {
    width: 22,
    height: 18,
    justifyContent: 'space-between',
  },
  iconLine: {
    height: 2.5,
    borderRadius: 1.5,
    width: '100%',
  },
  recordIconOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordIconOuterFocused: {
    borderColor: '#FF4D00',
  },
  recordIconInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
