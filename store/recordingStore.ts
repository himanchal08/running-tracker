import { create } from 'zustand';

export type RecordingStatus = 'idle' | 'recording' | 'paused';

interface LiveStats {
  liveDistanceM: number;
  liveMovingTimeS: number;
  liveElapsedTimeS: number;
  liveElevationGainM: number;
  liveGpsAccuracyM: number | null;
}

interface RecordingState extends LiveStats {
  status: RecordingStatus;
  activeActivityId: string | null;

  setStatus: (status: RecordingStatus, activityId: string | null) => void;
  setLiveStats: (stats: LiveStats) => void;
  setLiveGpsAccuracy: (accuracyM: number | null) => void;
  reset: () => void;
}

const INITIAL_STATE: Omit<RecordingState, 'setStatus' | 'setLiveStats' | 'setLiveGpsAccuracy' | 'reset'> = {
  status: 'idle',
  activeActivityId: null,
  liveDistanceM: 0,
  liveMovingTimeS: 0,
  liveElapsedTimeS: 0,
  liveElevationGainM: 0,
  liveGpsAccuracyM: null,
};

export const useRecordingStore = create<RecordingState>((set) => ({
  ...INITIAL_STATE,

  setStatus(status, activityId) {
    set({ status, activeActivityId: activityId });
  },

  setLiveStats(stats) {
    set(stats);
  },

  setLiveGpsAccuracy(accuracyM) {
    set({ liveGpsAccuracyM: accuracyM });
  },

  reset() {
    set(INITIAL_STATE);
  },
}));
