import { useEffect, useState } from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { widgetTaskHandler } from '../widget/widgetTaskHandler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getDb } from '../db/client';
import * as SplashScreen from 'expo-splash-screen';
import notifee, { EventType } from '@notifee/react-native';
import '../features/tracking/backgroundTask';

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
      await getDb();
      setDbReady(true);
      await SplashScreen.hideAsync();
      
      // Force update the widget when the app opens
      try {
        const db = getDb();
        const { getCurrentStreak, listActivities } = await import('../db/queries/activities');
        const { MovementWidget } = await import('../widget/Widget');
        
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
