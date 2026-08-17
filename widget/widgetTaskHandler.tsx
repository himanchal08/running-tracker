import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { MovementWidget } from './Widget';
import { getDb } from '../db/client';
import { getCurrentStreak, listActivities } from '../db/queries/activities';
import type { Activity } from '../db/schema';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  let streak = 0;
  let lastActivity: Activity | null = null;
  try {
    const db = getDb();
    const result = await getCurrentStreak(db);
    streak = result.current;
    
    const activities = await listActivities(db, { limit: 1 });
    if (activities.length > 0) {
      lastActivity = activities[0];
    }
  } catch (err) {
    console.error('Widget data fetch failed:', err);
  }

  props.renderWidget(<MovementWidget streak={streak} lastActivity={lastActivity} />);
}
