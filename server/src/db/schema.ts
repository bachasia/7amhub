/**
 * Lược đồ DB (Drizzle + SQLite). 3 bảng:
 *  - sources : danh sách nguồn RSS người dùng quản lý
 *  - articles: tin đã fetch + metadata do AI sinh (category/tags/tóm tắt)
 *  - digests : bản tin tổng hợp "Đề xuất 7AM" theo ngày
 * Các trường JSON (tags, ai_points, payload) lưu dạng text, parse khi đọc.
 */
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(), // slug hoặc 'f' + timestamp
  label: text('label').notNull(),
  url: text('url').notNull().unique(), // URL feed RSS
  siteUrl: text('site_url'), // homepage thật của báo (cho favicon) — lấy từ <channel><link>
  active: integer('active').notNull().default(1),
  createdAt: integer('created_at').notNull(),
});

export const articles = sqliteTable(
  'articles',
  {
    id: text('id').primaryKey(), // guid || link
    sourceId: text('source_id').notNull(),
    title: text('title').notNull(),
    url: text('url').notNull(),
    rawSummary: text('raw_summary'), // tóm tắt thô từ RSS description
    image: text('image'),
    fullText: text('full_text'), // toàn văn dạng text (input cho AI tóm tắt)
    content: text('content'), // JSON các block xen kẽ {t:'p'|'img', v} — giữ ảnh trong bài
    publishedAt: integer('published_at'), // ms
    fetchedAt: integer('fetched_at').notNull(),

    // ----- do AI sinh -----
    category: text('category'), // world | tech | science | news | biz
    tags: text('tags'), // JSON string[]
    aiLead: text('ai_lead'), // đoạn tóm tắt mở đầu
    aiPoints: text('ai_points'), // JSON string[] các ý chính
    hotScore: real('hot_score').notNull().default(0),

    // pending | ready | failed
    aiStatus: text('ai_status').notNull().default('pending'),
    aiTries: integer('ai_tries').notNull().default(0),
  },
  (t) => ({
    byStatus: index('idx_articles_ai_status').on(t.aiStatus),
    byPublished: index('idx_articles_published').on(t.publishedAt),
    bySource: index('idx_articles_source').on(t.sourceId),
  }),
);

export const digests = sqliteTable('digests', {
  date: text('date').primaryKey(), // YYYY-MM-DD (theo TZ cấu hình)
  payload: text('payload').notNull(), // JSON {intro, picks:[id], byCat:[{cat,ids}]}
  createdAt: integer('created_at').notNull(),
});

export type Source = typeof sources.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Digest = typeof digests.$inferSelect;
