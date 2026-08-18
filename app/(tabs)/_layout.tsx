import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { M, RADIUS } from '../../constants/theme';

// ─── Custom Icons ──────────────────────────────────────────────────────────

function RecordIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.recordOuter, { borderColor: color as string }]}>
        <View style={[styles.recordInner, { backgroundColor: color as string }]} />
      </View>
    </View>
  );
}

function HistoryIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.iconWrap}>
      <View style={styles.historyLines}>
        {[100, 75, 55].map((w, i) => (
          <View
            key={i}
            style={[styles.historyLine, { backgroundColor: color as string, width: `${w}%` as any }]}
          />
        ))}
      </View>
    </View>
  );
}

function InsightsIcon({ color }: { color: ColorValue }) {
  const heights = [6, 10, 16, 12, 8];
  return (
    <View style={styles.iconWrap}>
      <View style={styles.barsRow}>
        {heights.map((h, i) => (
          <View
            key={i}
            style={[styles.bar, { height: h, backgroundColor: color as string }]}
          />
        ))}
      </View>
    </View>
  );
}

function GoalsIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.iconWrap}>
      <View style={styles.trophyWrap}>
        <View style={[styles.trophyCup, { borderColor: color as string }]} />
        <View style={[styles.trophyStep, { backgroundColor: color as string }]} />
        <View style={[styles.trophyBase, { backgroundColor: color as string }]} />
      </View>
    </View>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: M.teal,
        tabBarInactiveTintColor: M.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ color }) => (
            <RecordIcon color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <HistoryIcon color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => (
            <InsightsIcon color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color }) => (
            <GoalsIcon color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: M.surface,
    borderTopWidth: 1,
    borderTopColor: M.borderFaint,
    height: 60,
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },

  // Record icon
  recordOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: M.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // History icon
  historyLines: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyLine: {
    height: 1.5,
    borderRadius: 1,
  },

  // Insights icon
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2.5,
    height: 18,
  },
  bar: {
    width: 3.5,
    borderRadius: 1.5,
  },

  // Goals / Trophy icon
  trophyWrap: {
    alignItems: 'center',
    gap: 1.5,
    height: 20,
    justifyContent: 'flex-end',
  },
  trophyCup: {
    width: 14,
    height: 9,
    borderRadius: 3,
    borderWidth: 1.5,
    borderBottomWidth: 0,
  },
  trophyStep: {
    width: 6,
    height: 3,
  },
  trophyBase: {
    width: 10,
    height: 2,
    borderRadius: 1,
  },
});
