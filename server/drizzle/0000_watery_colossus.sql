CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`raw_summary` text,
	`image` text,
	`full_text` text,
	`published_at` integer,
	`fetched_at` integer NOT NULL,
	`category` text,
	`tags` text,
	`ai_lead` text,
	`ai_points` text,
	`hot_score` real DEFAULT 0 NOT NULL,
	`ai_status` text DEFAULT 'pending' NOT NULL,
	`ai_tries` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_articles_ai_status` ON `articles` (`ai_status`);--> statement-breakpoint
CREATE INDEX `idx_articles_published` ON `articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_articles_source` ON `articles` (`source_id`);--> statement-breakpoint
CREATE TABLE `digests` (
	`date` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_url_unique` ON `sources` (`url`);