CREATE INDEX `idx_articles_feed_order` ON `articles` (`feed_order`);--> statement-breakpoint
CREATE INDEX `idx_articles_status_feed_order` ON `articles` (`ai_status`,`feed_order`);--> statement-breakpoint
CREATE INDEX `idx_articles_source_fetched_at` ON `articles` (`source_id`,`fetched_at`);