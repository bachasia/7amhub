# Phase 02 — Port backend lib + migrations

**Priority:** P0 · **Status:** ⬜ · **Depends:** 01

## Mục tiêu
Đưa toàn bộ logic backend (framework-agnostic) sang `app/src/lib/`, tái dùng DB hiện có.

## Việc
1. Copy gần 1:1 từ `server/src/` → `app/src/lib/`:
   - `db/{schema,client,migrate}.ts`, `ingest/{rss,extract}.ts`, `ai/{client,classify,digest}.ts`,
     `jobs/{ingest-job,ai-worker,digest-job}.ts`, `serialize.ts`, `config.ts`, `rel-time.ts`, `hot-score.ts`, `lib/html.ts`, `concurrency.ts`, `local-date.ts`.
2. Sửa import paths cho cấu trúc mới; bỏ phụ thuộc Hono (chỉ còn dữ liệu thuần).
3. `config.ts`: đọc env qua `process.env` (Next.js server runtime). Giữ ANTHROPIC_BASE_URL/AUTH_TOKEN.
4. Drizzle: `drizzle.config.ts`, copy `drizzle/` migrations. Trỏ `DB_PATH` về `data/7amhub.db` hiện có (giữ dữ liệu đã AI hoá).
   - **Thêm 2 bảng mới** (đồng bộ saved/read server-side, single-user toàn cục):
     `saved_articles(article_id text PK, created_at int)`, `read_articles(article_id text PK, read_at int)`. Sinh migration mới.
5. Đảm bảo `better-sqlite3` chạy trong Node runtime (route handlers + worker khai báo `export const runtime='nodejs'`).

## Success
- `tsx app/src/lib/db/migrate.ts` OK; truy vấn thử đếm articles ra số > 0 từ DB cũ.
