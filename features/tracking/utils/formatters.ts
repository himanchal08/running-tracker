export function formatDistance(metres: number, unit: 'km' | 'mi' = 'km'): string {
  if (unit === 'mi') {
    const miles = metres / 1609.344;
    return `${miles.toFixed(2)} mi`;
  }
  if (metres < 1000) {
    return `${Math.round(metres)} m`;
  }
  return `${(metres / 1000).toFixed(2)} km`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function computePaceSecPerUnit(
  distanceM: number,
  movingTimeS: number,
  unit: 'km' | 'mi' = 'km',
): number | null {
  if (distanceM <= 0 || movingTimeS <= 0) return null;
  const unitM = unit === 'mi' ? 1609.344 : 1000;
  return (movingTimeS / distanceM) * unitM;
}

export function formatPace(secPerUnit: number | null, unit: 'km' | 'mi' = 'km'): string {
  if (secPerUnit === null || !isFinite(secPerUnit) || secPerUnit <= 0) {
    return `--:-- /${unit}`;
  }
  const minutes = Math.floor(secPerUnit / 60);
  const seconds = Math.round(secPerUnit % 60);
  const ss = String(seconds).padStart(2, '0');
  return `${minutes}:${ss} /${unit}`;
}

export function formatSpeed(speedMs: number | null, unit: 'km' | 'mi' = 'km'): string {
  if (speedMs === null || speedMs < 0) return `-- ${unit === 'mi' ? 'mph' : 'km/h'}`;
  if (unit === 'mi') {
    return `${(speedMs * 2.23694).toFixed(1)} mph`;
  }
  return `${(speedMs * 3.6).toFixed(1)} km/h`;
}

export function gpsAccuracyLabel(accuracyM: number | null): string {
  if (accuracyM === null) return 'No signal';
  if (accuracyM <= 10) return 'Excellent';
  if (accuracyM <= 20) return 'Good';
  if (accuracyM <= 30) return 'Fair';
  return 'Poor';
}

export function gpsAccuracyColor(accuracyM: number | null): string {
  if (accuracyM === null) return '#9CA3AF';
  if (accuracyM <= 10) return '#10B981';
  if (accuracyM <= 20) return '#3B82F6';
  if (accuracyM <= 30) return '#F59E0B';
  return '#EF4444';
}

export function formatActivityDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  const month = months[date.getMonth()];

  if (date.getFullYear() === now.getFullYear()) {
    return `${dayName} ${dayNum} ${month}`;
  }
  return `${dayNum} ${month} ${date.getFullYear()}`;
}

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  walking: 'Walking',
  running: 'Running',
  cycling: 'Cycling',
  hiking: 'Hiking',
  unknown: 'Activity',
};

export const ACTIVITY_TYPE_EMOJI: Record<string, string> = {
  walking: '🚶',
  running: '🏃',
  cycling: '🚴',
  hiking: '🥾',
  unknown: '📍',
};
