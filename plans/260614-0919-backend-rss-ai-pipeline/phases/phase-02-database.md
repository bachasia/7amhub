# Phase 02 — DB schema + migrations

**Priority:** P0 · **Status:** ⬜ · **Depends:** 01

## Schema (Drizzle, SQLite)

### sources
- `id` text PK (slug/`f`+ts) · `label` text · `url` text unique · `active` int default 1 · `created_at` int

### articles
- `id` text PK (guid||link) · `source_id` text FK
- `title` text · `url` text · `raw_summary` text · `image` text
- `full_text` text (nullable) · `published_at` int · `fetched_at` int
- AI: `category` text (world/tech/science/news/biz, nullable) · `tags` text(JSON) · `ai_lead` text · `ai_points` text(JSON) · `hot_score` real default 0
- `ai_status` text: `pending|ready|failed` default pending
- index: `(ai_status)`, `(published_at desc)`, `(source_id)`

### digests
- `date` text PK (YYYY-MM-DD) · `payload` text(JSON: {by_cat:[{cat,items[]}], picks:[ids], intro}) · `created_at` int

## Việc làm
1. `src/db/schema.ts` — định nghĩa 3 bảng trên.
2. `src/db/client.ts` — better-sqlite3 + drizzle, WAL mode, tạo `data/` nếu thiếu.
3. `src/db/migrate.ts` — chạy migrations folder.
4. `drizzle.config.ts` → `npm run db:gen` sinh SQL.

## Success
- `npm run db:gen && npm run db:migrate` tạo `data/7amhub.db` đủ 3 bảng.
