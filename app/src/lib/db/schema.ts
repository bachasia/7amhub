/**
 * Lược đồ DB (Drizzle + SQLite). 5 bảng:
 *  - sources       : danh sách nguồn RSS người dùng quản lý
 *  - articles      : tin đã fetch + metadata do AI sinh (category/tags/tóm tắt)
 *  - digests       : bản tin tổng hợp "Đề xuất 7AM" theo ngày
 *  - saved_articles: bài đã lưu (single-user toàn cục, đồng bộ server-side)
 *  - read_articles : bài đã đọc (single-user toàn cục, đồng bộ server-side)
 */
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull().unique(),
  siteUrl: text("site_url"),
  active: integer("active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
});

export const articles = sqliteTable(
  "articles",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    rawSummary: text("raw_summary"),
    image: text("image"),
    fullText: text("full_text"),
    content: text("content"),
    publishedAt: integer("published_at"),
    fetchedAt: integer("fetched_at").notNull(),
    category: text("category"),
    tags: text("tags"),
    aiLead: text("ai_lead"),
    aiPoints: text("ai_points"),
    hotScore: real("hot_score").notNull().default(0),
    aiStatus: text("ai_status").notNull().default("pending"),
    aiTries: integer("ai_tries").notNull().default(0),
  },
  (t) => ({
    byStatus: index("idx_articles_ai_status").on(t.aiStatus),
    byPublished: index("idx_articles_published").on(t.publishedAt),
    bySource: index("idx_articles_source").on(t.sourceId),
  })
);

export const digests = sqliteTable("digests", {
  date: text("date").primaryKey(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const savedArticles = sqliteTable("saved_articles", {
  articleId: text("article_id").primaryKey(),
  createdAt: integer("created_at").notNull(),
});

export const readArticles = sqliteTable("read_articles", {
  articleId: text("article_id").primaryKey(),
  readAt: integer("read_at").notNull(),
});

export type Source = typeof sources.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Digest = typeof digests.$inferSelect;
export type SavedArticle = typeof savedArticles.$inferSelect;
export type ReadArticle = typeof readArticles.$inferSelect;
