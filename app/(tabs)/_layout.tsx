import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';

const GH = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  muted: '#8b949e',
  green: '#2ea043',
  greenBright: '#3fb950',
  blue: '#58a6ff',
  accent: '#238636',
};

function HistoryIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.iconContainer}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.iconLine, { backgroundColor: color, width: `${100 - i * 15}%` }]} />
      ))}
    </View>
  );
}

function RecordIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
  return (
    <View style={[styles.recordIconOuter, focused && { borderColor: GH.green }]}>
      <View style={[styles.recordIconInner, { backgroundColor: color }]} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GH.greenBright,
        tabBarInactiveTintColor: GH.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: GH.text,
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
    backgroundColor: GH.surface,
    borderTopWidth: 1,
    borderTopColor: GH.border,
    height: 64,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  header: {
    backgroundColor: GH.surface,
    shadowColor: 'transparent',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: GH.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: GH.text,
  },
  iconContainer: {
    width: 22,
    height: 18,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconLine: {
    height: 2.5,
    borderRadius: 1.5,
  },
  recordIconOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: GH.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordIconInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
