import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { MovementWidget } from './Widget';
import { getDb } from '../db/client';
import { getCurrentStreak } from '../db/queries/activities';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  let streak = 0;
  try {
    const db = getDb();
    const result = await getCurrentStreak(db);
    streak = result.current;
  } catch (err) {
    console.error('Widget data fetch failed:', err);
  }

  props.renderWidget(<MovementWidget streak={streak} />);
}
