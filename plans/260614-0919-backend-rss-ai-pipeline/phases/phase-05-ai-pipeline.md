# Phase 05 — AI pipeline (Haiku): classify + tag + summary

**Priority:** P0 · **Status:** ⬜ · **Depends:** 04

## Mục tiêu
Worker xử lý bài `ai_status=pending`: gọi Claude Haiku 1 lần/bài → điền category + tags + ai_lead + ai_points → set `ready`.

## Việc làm
1. `src/ai/client.ts` — khởi tạo Anthropic SDK từ ANTHROPIC_API_KEY; helper `callJSON(model, system, user, schema)` dùng tool-use/JSON mode + zod parse, retry 2 lần.
2. `src/ai/classify.ts` — `analyzeArticle({title, text})`:
   - 1 lần gọi Haiku trả JSON: `{ category: enum(world|tech|science|news|biz), tags: string[2..4], lead: string, points: string[2..3] }`.
   - System prompt tiếng Việt: phân loại đúng 1 danh mục; tag ngắn (thương hiệu/chủ đề); tóm tắt khách quan, không bịa.
   - Input text = full_text (cắt 6000 ký tự) || raw_summary.
3. `src/jobs/ai-worker.ts`:
   - `processPending(limit=10)` — lấy batch pending; với mỗi bài: extract full-text nếu thiếu → analyzeArticle → update DB (ready/failed). Concurrency 3 (p-limit thủ công).
   - Chạy sau mỗi lần ingest + interval ngắn (vd mỗi 2') để vét pending.
4. Tính `hot_score` sơ bộ = f(recency, có ảnh, độ dài) — refine ở Phase 06.

## Lưu ý chi phí
- Chỉ gọi cho pending; thành công → ready, không gọi lại.
- failed: retry tối đa 2 lần (đếm bằng cột phụ hoặc để cron vét lại có giới hạn).

## Success
- Bài mới sau ingest → trong vài phút có category + tags + tóm tắt; gọi lại không tốn thêm AI.
