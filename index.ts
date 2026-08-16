if (typeof window !== 'undefined' && !window.location) {
  // @ts-expect-error - native polyfill
  window.location = { origin: 'native://app' };
}

import 'expo-router/entry';
