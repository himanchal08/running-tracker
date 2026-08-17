if (typeof window !== 'undefined' && !window.location) {
  // @ts-expect-error - native polyfill
  window.location = { origin: 'native://app' };
}

import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widget/widgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);
