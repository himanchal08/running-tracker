CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'unknown' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`distance_m` real DEFAULT 0 NOT NULL,
	`moving_time_s` integer DEFAULT 0 NOT NULL,
	`elapsed_time_s` integer DEFAULT 0 NOT NULL,
	`elevation_gain_m` real DEFAULT 0 NOT NULL,
	`elevation_loss_m` real DEFAULT 0 NOT NULL,
	`avg_speed_ms` real,
	`max_speed_ms` real,
	`calorie_estimate` real,
	`gps_quality_score` real,
	`is_manual_override` integer DEFAULT false NOT NULL,
	`trashed_at` integer,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `activities_started_at_idx` ON `activities` (`started_at`);--> statement-breakpoint
CREATE INDEX `activities_trashed_at_idx` ON `activities` (`trashed_at`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`metric` text NOT NULL,
	`period` text NOT NULL,
	`target_value` real NOT NULL,
	`start_date` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personal_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`value` real NOT NULL,
	`activity_id` text,
	`achieved_at` integer NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_id` text NOT NULL,
	`ts` integer NOT NULL,
	`lat` real NOT NULL,
	`lon` real NOT NULL,
	`altitude_m` real,
	`horizontal_accuracy_m` real,
	`speed_ms` real,
	`is_filtered_outlier` integer DEFAULT false NOT NULL,
	`is_moving` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `points_activity_id_idx` ON `points` (`activity_id`);--> statement-breakpoint
CREATE INDEX `points_ts_idx` ON `points` (`ts`);--> statement-breakpoint
CREATE TABLE `route_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`route_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`delta_vs_best_s` real,
	FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_polyline` text NOT NULL,
	`first_seen_at` integer NOT NULL,
	`times_repeated` integer DEFAULT 1 NOT NULL,
	`display_name` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `splits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_id` text NOT NULL,
	`split_index` integer NOT NULL,
	`distance_unit` text NOT NULL,
	`duration_s` integer NOT NULL,
	`avg_pace_sec_per_unit` real,
	`elevation_delta_m` real,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `splits_activity_id_idx` ON `splits` (`activity_id`);