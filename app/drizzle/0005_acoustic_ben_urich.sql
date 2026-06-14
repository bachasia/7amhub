CREATE TABLE `chat_usage` (
	`date` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `read_articles` (
	`article_id` text PRIMARY KEY NOT NULL,
	`read_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_articles` (
	`article_id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `sources` ADD `sublabel` text;