CREATE TABLE `saved_articles` (
	`article_id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `read_articles` (
	`article_id` text PRIMARY KEY NOT NULL,
	`read_at` integer NOT NULL
);
