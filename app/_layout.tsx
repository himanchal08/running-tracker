import { useEffect, useState } from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { getCurrentStreak, listActivities } from '../db/queries/activities';
import { MovementWidget } from '../widget/Widget';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getDb } from '../db/client';
import * as SplashScreen from 'expo-splash-screen';
import * as Location from 'expo-location';
import notifee, { EventType } from '@notifee/react-native';
import '../features/tracking/backgroundTask';
import { recoverRecordingState } from '../features/tracking/locationService';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  // Empty handler to satisfy notifee requirement
});

notifee.registerForegroundService((notification) => {
  return new Promise(() => {
    // Keep foreground service alive until explicitly stopped
  });
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const db = await getDb();
      setDbReady(true);
      await SplashScreen.hideAsync();

      // ── Recording recovery ───────────────────────────────────────────────
      // If the background location task is still running (app was killed while
      // recording), re-hydrate the pipeline and store from the DB so the UI
      // and background task both work correctly again.
      try {
        const taskRunning = await Location.hasStartedLocationUpdatesAsync(
          'BACKGROUND_LOCATION_TASK',
        );
        if (taskRunning) {
          // The most recent unfinished activity (endedAt is null) is the live one.
          const allActivities = await listActivities(db, { limit: 10 });
          const liveActivity = allActivities.find((a) => !(a as any).endedAt);
          if (liveActivity) {
            await recoverRecordingState(liveActivity.id);
          }
        }
      } catch (err) {
        console.warn('[_layout] Recording recovery check failed:', err);
      }

      // ── Widget refresh ───────────────────────────────────────────────────
      try {
        const streakResult = await getCurrentStreak(db);
        const activities = await listActivities(db, { limit: 1 });
        await requestWidgetUpdate({
          widgetName: 'MovementWidget',
          renderWidget: () => <MovementWidget streak={streakResult.current} lastActivity={activities[0]} />,
        });
      } catch (err) {
        console.error('Failed to update widget on launch', err);
      }
    };
    init();
  }, []);


  if (!dbReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="activity/[id]"
            options={{
              title: 'Activity',
              headerBackTitle: 'History',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
