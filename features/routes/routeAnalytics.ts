import type { Activity, Route, RouteAttempt } from '../../db/schema';

export interface AttemptWithActivity {
  attempt: RouteAttempt;
  activity: Activity;
}

export function getRouteAttemptsSorted(
  attempts: RouteAttempt[],
  activities: Activity[],
): AttemptWithActivity[] {
  const actMap = new Map(activities.map((a) => [a.id, a]));
  const paired: AttemptWithActivity[] = [];

  for (const attempt of attempts) {
    const activity = actMap.get(attempt.activityId);
    if (activity) {
      paired.push({ attempt, activity });
    }
  }

  return paired.sort(
    (a, b) => b.activity.startedAt.getTime() - a.activity.startedAt.getTime(),
  );
}

export function getBestAttempt(attempts: AttemptWithActivity[]): AttemptWithActivity | null {
  if (attempts.length === 0) return null;

  let best: AttemptWithActivity | null = null;
  for (const a of attempts) {
    if (a.activity.movingTimeS <= 0) continue;
    if (!best || a.activity.movingTimeS < best.activity.movingTimeS) {
      best = a;
    }
  }
  return best;
}

export function computeDeltaVsBest(
  attempt: AttemptWithActivity,
  best: AttemptWithActivity,
): number {
  return attempt.activity.movingTimeS - best.activity.movingTimeS;
}

export function formatDelta(deltaS: number): string {
  if (deltaS === 0) return 'Best time';
  const abs = Math.abs(deltaS);
  const sign = deltaS > 0 ? '+' : '-';
  if (abs < 60) return `${sign}${abs}s`;
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  return `${sign}${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
}

export function getRouteSummary(route: Route, attempts: AttemptWithActivity[]): string {
  if (attempts.length === 0) return 'No completed attempts yet.';

  const best = getBestAttempt(attempts);
  const totalAttempts = attempts.length;
  const routeName = route.displayName ?? 'This route';

  if (totalAttempts === 1) {
    return `${routeName} was first recorded on ${attempts[0].activity.startedAt.toLocaleDateString()}.`;
  }

  const parts: string[] = [];
  parts.push(`${routeName} has been attempted ${totalAttempts} times.`);

  if (best && attempts.length >= 2) {
    const sorted = [...attempts].sort(
      (a, b) => a.activity.movingTimeS - b.activity.movingTimeS,
    );
    const second = sorted[1];
    const delta = computeDeltaVsBest(second, best);
    if (delta > 0) {
      parts.push(`Your best time is ${formatDelta(-delta)} ahead of your second-best.`);
    }
  }

  const recent = attempts[0];
  if (best && recent.activity.id !== best.activity.id) {
    const delta = computeDeltaVsBest(recent, best);
    if (delta <= 0) {
      parts.push('Your last run was a personal best!');
    } else {
      parts.push(`Your last run was ${formatDelta(delta)} off your best.`);
    }
  } else if (best && recent.activity.id === best.activity.id) {
    parts.push('Your last run was your best time!');
  }

  return parts.join(' ');
}
