import { getDb } from '../../db/client';
import type { Db } from '../../db/client';
import { listActivities } from '../../db/queries/activities';
import { getDailyMetricsRange, getDailyMetric } from '../../db/queries/dailyMetrics';
import type { Goal } from '../../db/schema';
import { getWeekStart, getWeekEnd } from '../analysis/weeklyStats';

export interface GoalProgress {
  goal: Goal;
  currentValue: number;
  progressPct: number;
  isCompleted: boolean;
  label: string;
}

export async function computeGoalsProgress(db: Db, goals: Goal[]): Promise<GoalProgress[]> {
  if (goals.length === 0) return [];

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(weekStart);
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // We can fetch activities for the widest range we need. For simplicity, just get month activities.
  // Actually, we could just get all recent activities and filter in memory.
  const allActs = await listActivities(db, { limit: 1000 });
  const weekActs = allActs.filter((a) => a.startedAt >= weekStart && a.startedAt <= weekEnd);
  const monthActs = allActs.filter((a) => a.startedAt >= monthStart && a.startedAt <= monthEnd);

  // For steps, we need daily metrics
  const weekMetrics = await getDailyMetricsRange(db, weekStart.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10));
  const monthMetrics = await getDailyMetricsRange(db, monthStart.toISOString().slice(0, 10), monthEnd.toISOString().slice(0, 10));
  const todayMetric = await getDailyMetric(db, todayStr);

  return goals.map((goal) => {
    let currentValue = 0;

    if (goal.metric === 'steps') {
      if (goal.period === 'day') {
        currentValue = todayMetric?.steps ?? 0;
      } else if (goal.period === 'week') {
        currentValue = weekMetrics.reduce((sum, m) => sum + m.steps, 0);
      } else if (goal.period === 'month') {
        currentValue = monthMetrics.reduce((sum, m) => sum + m.steps, 0);
      }
    } else {
      let relevantActs: typeof allActs = [];
      if (goal.period === 'day') {
        relevantActs = allActs.filter((a) => a.startedAt.toISOString().slice(0, 10) === todayStr);
      } else if (goal.period === 'week') {
        relevantActs = weekActs;
      } else if (goal.period === 'month') {
        relevantActs = monthActs;
      }

      if (goal.metric === 'distance') {
        currentValue = relevantActs.reduce((sum, a) => sum + a.distanceM, 0);
      } else if (goal.metric === 'time') {
        currentValue = relevantActs.reduce((sum, a) => sum + a.movingTimeS, 0);
      } else if (goal.metric === 'elevation') {
        currentValue = relevantActs.reduce((sum, a) => sum + a.elevationGainM, 0);
      } else if (goal.metric === 'activities') {
        currentValue = relevantActs.length;
      }
    }

    const progressPct = Math.min(100, Math.round((currentValue / goal.targetValue) * 100));
    const isCompleted = currentValue >= goal.targetValue;
    
    let label = '';
    if (goal.metric === 'distance') label = `${(currentValue / 1000).toFixed(1)} / ${(goal.targetValue / 1000).toFixed(1)} km`;
    else if (goal.metric === 'time') label = `${Math.floor(currentValue / 3600)}h / ${Math.floor(goal.targetValue / 3600)}h`;
    else if (goal.metric === 'elevation') label = `${Math.round(currentValue)} / ${Math.round(goal.targetValue)} m`;
    else if (goal.metric === 'steps') label = `${currentValue} / ${goal.targetValue} steps`;
    else if (goal.metric === 'activities') label = `${currentValue} / ${goal.targetValue} activities`;

    return {
      goal,
      currentValue,
      progressPct,
      isCompleted,
      label,
    };
  });
}
