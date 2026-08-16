import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { handleLocationUpdate } from './locationService';

export const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[TaskManager] Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    for (const loc of locations) {
      await handleLocationUpdate(loc);
    }
  }
});
