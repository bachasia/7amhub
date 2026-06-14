# Phase 03 — RSS ingestion + cron

**Priority:** P0 · **Status:** ⬜ · **Depends:** 02

## Mục tiêu
Fetch tất cả nguồn RSS active server-side, parse, dedupe, insert bài mới (ai_status=pending).

## Việc làm
1. `src/ingest/rss.ts`:
   - `fetchSource(src)` — rss-parser lấy items.
   - `parseItem(item, src)` — trích title, link, raw_summary (strip HTML từ description), image (từ `<img>` trong description || enclosure || media), published_at (pubDate → ms), id = guid||link.
   - `ingestAll()` — Promise.allSettled mọi source active; gộp items; **dedupe theo id** (bỏ bài đã tồn tại trong DB); insert mới; trả `{inserted, failed}`.
2. `src/jobs/ingest-job.ts` — wrap ingestAll + log; export `startIngestCron()` dùng `INGEST_CRON` (mặc định `*/15 * * * *`).
3. Seed: nếu bảng sources rỗng, insert 5 nguồn VnExpress mặc định (từ news-hub DEFAULT_SOURCES) — không gắn cat thủ công.
4. Gọi `startIngestCron()` + chạy 1 lần lúc boot trong `src/index.ts`.

## Lưu ý
- Mỗi bài chỉ insert 1 lần (id unique) → không tốn AI lại.
- relTime tính ở API response, không lưu cứng.

## Success
- Boot → DB có bài mới từ 5 nguồn, không trùng lặp khi chạy lại.
