import type { Db } from '../../db/client';
import { listActivities } from '../../db/queries/activities';
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

  const allActs = await listActivities(db, { limit: 1000 });
  const weekActs = allActs.filter((a) => a.startedAt >= weekStart && a.startedAt <= weekEnd);
  const monthActs = allActs.filter((a) => a.startedAt >= monthStart && a.startedAt <= monthEnd);

  return goals.map((goal) => {
    let currentValue = 0;
    
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

    const progressPct = Math.min(100, Math.round((currentValue / goal.targetValue) * 100));
    const isCompleted = currentValue >= goal.targetValue;
    
    let label = '';
    if (goal.metric === 'distance') label = `${(currentValue / 1000).toFixed(1)} / ${(goal.targetValue / 1000).toFixed(1)} km`;
    else if (goal.metric === 'time') label = `${Math.floor(currentValue / 3600)}h / ${Math.floor(goal.targetValue / 3600)}h`;
    else if (goal.metric === 'elevation') label = `${Math.round(currentValue)} / ${Math.round(goal.targetValue)} m`;
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
