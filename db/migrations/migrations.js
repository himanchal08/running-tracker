// @ts-nocheck
// This file is required by db/client.ts for drizzle-orm/op-sqlite migrations.
// It bundles the raw SQL from drizzle-kit generated migration files.

const migrations = {
  journal: {
    version: '7',
    dialect: 'sqlite',
    entries: [
      {
        idx: 0,
        version: '7',
        when: 1723794000000,
        tag: '0000_dear_mister_sinister',
        breakpoints: true,
      },
    ],
  },
  migrations: {
    'm0000': `CREATE TABLE IF NOT EXISTS \`activities\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`type\` text DEFAULT 'unknown' NOT NULL,
\t\`started_at\` integer NOT NULL,
\t\`ended_at\` integer,
\t\`distance_m\` real DEFAULT 0 NOT NULL,
\t\`moving_time_s\` integer DEFAULT 0 NOT NULL,
\t\`elapsed_time_s\` integer DEFAULT 0 NOT NULL,
\t\`elevation_gain_m\` real DEFAULT 0 NOT NULL,
\t\`elevation_loss_m\` real DEFAULT 0 NOT NULL,
\t\`avg_speed_ms\` real,
\t\`max_speed_ms\` real,
\t\`calorie_estimate\` real,
\t\`gps_quality_score\` real,
\t\`is_manual_override\` integer DEFAULT false NOT NULL,
\t\`trashed_at\` integer,
\t\`notes\` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`activities_started_at_idx\` ON \`activities\` (\`started_at\`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`activities_trashed_at_idx\` ON \`activities\` (\`trashed_at\`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`goals\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`metric\` text NOT NULL,
\t\`period\` text NOT NULL,
\t\`target_value\` real NOT NULL,
\t\`start_date\` text NOT NULL,
\t\`is_active\` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`personal_records\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`category\` text NOT NULL,
\t\`value\` real NOT NULL,
\t\`activity_id\` text,
\t\`achieved_at\` integer NOT NULL,
\tFOREIGN KEY (\`activity_id\`) REFERENCES \`activities\`(\`id\`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`points\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`activity_id\` text NOT NULL,
\t\`ts\` integer NOT NULL,
\t\`lat\` real NOT NULL,
\t\`lon\` real NOT NULL,
\t\`altitude_m\` real,
\t\`horizontal_accuracy_m\` real,
\t\`speed_ms\` real,
\t\`is_filtered_outlier\` integer DEFAULT false NOT NULL,
\t\`is_moving\` integer DEFAULT true NOT NULL,
\tFOREIGN KEY (\`activity_id\`) REFERENCES \`activities\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`points_activity_id_idx\` ON \`points\` (\`activity_id\`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`points_ts_idx\` ON \`points\` (\`ts\`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`route_attempts\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`route_id\` text NOT NULL,
\t\`activity_id\` text NOT NULL,
\t\`delta_vs_best_s\` real,
\tFOREIGN KEY (\`route_id\`) REFERENCES \`routes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
\tFOREIGN KEY (\`activity_id\`) REFERENCES \`activities\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`routes\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`canonical_polyline\` text NOT NULL,
\t\`first_seen_at\` integer NOT NULL,
\t\`times_repeated\` integer DEFAULT 1 NOT NULL,
\t\`display_name\` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`settings\` (
\t\`key\` text PRIMARY KEY NOT NULL,
\t\`value\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`splits\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`activity_id\` text NOT NULL,
\t\`split_index\` integer NOT NULL,
\t\`distance_unit\` text NOT NULL,
\t\`duration_s\` integer NOT NULL,
\t\`avg_pace_sec_per_unit\` real,
\t\`elevation_delta_m\` real,
\tFOREIGN KEY (\`activity_id\`) REFERENCES \`activities\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`splits_activity_id_idx\` ON \`splits\` (\`activity_id\`);`,
  },
};

module.exports = migrations;
