import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { M, RADIUS } from '../../constants/theme';

// ─── Custom Icons ──────────────────────────────────────────────────────────

function RecordIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.recordOuter, focused && { borderColor: M.teal }]}>
        <View style={[styles.recordInner, { backgroundColor: color as string }]} />
      </View>
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

function HistoryIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
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
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

function InsightsIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
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
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

function GoalsIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <View style={styles.trophyWrap}>
        <View style={[styles.trophyCup, { borderColor: color as string }]} />
        <View style={[styles.trophyStep, { backgroundColor: color as string }]} />
        <View style={[styles.trophyBase, { backgroundColor: color as string }]} />
      </View>
      {focused && <View style={styles.activeDot} />}
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
        tabBarShowLabel: false,
        headerShown: false,
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
          tabBarIcon: ({ color, focused }) => (
            <HistoryIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <InsightsIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, focused }) => (
            <GoalsIcon color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 58,
    right: 58,
    height: 66,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(15,14,28,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    paddingBottom: 0,
    paddingTop: 0,
  },
  tabLabel: {
    display: 'none',
  },
  iconWrap: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: M.teal,
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
