import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  type: text('type', {
    enum: ['walking', 'running', 'cycling', 'hiking', 'unknown'],
  }).notNull().default('unknown'),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
  distanceM: real('distance_m').notNull().default(0),
  movingTimeS: integer('moving_time_s').notNull().default(0),
  elapsedTimeS: integer('elapsed_time_s').notNull().default(0),
  elevationGainM: real('elevation_gain_m').notNull().default(0),
  elevationLossM: real('elevation_loss_m').notNull().default(0),
  avgSpeedMs: real('avg_speed_ms'),
  maxSpeedMs: real('max_speed_ms'),
  calorieEstimate: real('calorie_estimate'),
  gpsQualityScore: real('gps_quality_score'),
  isManualOverride: integer('is_manual_override', { mode: 'boolean' }).notNull().default(false),
  trashedAt: integer('trashed_at', { mode: 'timestamp_ms' }),
  notes: text('notes'),
}, (t) => ({
  startedAtIdx: index('activities_started_at_idx').on(t.startedAt),
  trashedAtIdx: index('activities_trashed_at_idx').on(t.trashedAt),
}));

export const points = sqliteTable('points', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  activityId: text('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  ts: integer('ts', { mode: 'timestamp_ms' }).notNull(),
  lat: real('lat').notNull(),
  lon: real('lon').notNull(),
  altitudeM: real('altitude_m'),
  horizontalAccuracyM: real('horizontal_accuracy_m'),
  speedMs: real('speed_ms'),
  isFilteredOutlier: integer('is_filtered_outlier', { mode: 'boolean' }).notNull().default(false),
  isMoving: integer('is_moving', { mode: 'boolean' }).notNull().default(true),
}, (t) => ({
  activityIdx: index('points_activity_id_idx').on(t.activityId),
  tsIdx: index('points_ts_idx').on(t.ts),
}));

export const splits = sqliteTable('splits', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  activityId: text('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  splitIndex: integer('split_index').notNull(),
  distanceUnit: text('distance_unit', { enum: ['km', 'mi'] }).notNull(),
  durationS: integer('duration_s').notNull(),
  avgPaceSecPerUnit: real('avg_pace_sec_per_unit'),
  elevationDeltaM: real('elevation_delta_m'),
}, (t) => ({
  activityIdx: index('splits_activity_id_idx').on(t.activityId),
}));


export const routes = sqliteTable('routes', {
  id: text('id').primaryKey(),
  canonicalPolyline: text('canonical_polyline').notNull(),
  firstSeenAt: integer('first_seen_at', { mode: 'timestamp_ms' }).notNull(),
  timesRepeated: integer('times_repeated').notNull().default(1),
  displayName: text('display_name'),
});

export const routeAttempts = sqliteTable('route_attempts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  routeId: text('route_id').notNull().references(() => routes.id, { onDelete: 'cascade' }),
  activityId: text('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  deltaVsBestS: real('delta_vs_best_s'),
});

export const goals = sqliteTable('goals', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  metric: text('metric').notNull(),
  period: text('period', { enum: ['day', 'week', 'month'] }).notNull(),
  targetValue: real('target_value').notNull(),
  startDate: text('start_date').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Point = typeof points.$inferSelect;
export type NewPoint = typeof points.$inferInsert;
export type Split = typeof splits.$inferSelect;
export type NewSplit = typeof splits.$inferInsert;

export type Route = typeof routes.$inferSelect;
export type RouteAttempt = typeof routeAttempts.$inferSelect;
export type Goal = typeof goals.$inferSelect;
