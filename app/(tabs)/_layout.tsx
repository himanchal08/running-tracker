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
        <View
          key={i}
          style={[styles.iconLine, { backgroundColor: color, width: `${100 - i * 18}%` as any }]}
        />
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

function MapIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.mapIconContainer}>
      <View style={[styles.mapIconCircle, { borderColor: color }]} />
      <View style={[styles.mapIconTail, { backgroundColor: color }]} />
    </View>
  );
}

function WeeklyIcon({ color }: { color: ColorValue }) {
  const heights = [8, 12, 16];
  return (
    <View style={styles.weeklyIconContainer}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[styles.weeklyBar, { backgroundColor: color, height: h }]}
        />
      ))}
    </View>
  );
}

function RecordsIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.trophyContainer}>
      <View style={[styles.trophyCup, { borderColor: color }]} />
      <View style={[styles.trophyBase, { backgroundColor: color }]} />
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
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ color, focused }) => (
            <RecordIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <HistoryIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="heatmap"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <MapIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="weekly"
        options={{
          title: 'Weekly',
          tabBarIcon: ({ color }) => <WeeklyIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          tabBarIcon: ({ color }) => <RecordsIcon color={color} />,
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
    height: 60,
    paddingBottom: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
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
    width: 20,
    height: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconLine: {
    height: 2,
    borderRadius: 1.5,
  },
  recordIconOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GH.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordIconInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  mapIconContainer: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'flex-end',
  },
  mapIconCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  mapIconTail: {
    width: 2,
    height: 6,
    borderRadius: 1,
    marginTop: -1,
  },
  weeklyIconContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 18,
  },
  weeklyBar: {
    width: 4,
    borderRadius: 1,
  },
  trophyContainer: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'flex-end',
    gap: 1,
  },
  trophyCup: {
    width: 14,
    height: 10,
    borderRadius: 3,
    borderWidth: 2,
    borderBottomWidth: 0,
  },
  trophyBase: {
    width: 10,
    height: 3,
    borderRadius: 1,
  },
});
