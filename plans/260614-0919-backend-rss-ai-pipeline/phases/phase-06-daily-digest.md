# Phase 06 — Daily digest (Sonnet) + cron 7AM

**Priority:** P0 · **Status:** ⬜ · **Depends:** 05

## Mục tiêu
Mỗi 07:00 (Asia/Saigon) tổng hợp tin 24h qua → Sonnet chọn tin nóng + đề xuất theo danh mục → lưu `digests`.

## Việc làm
1. `src/ai/digest.ts` — `buildDigest(date)`:
   - Lấy bài `ready` trong 24h (title, category, tags, ai_lead, hot_score, id).
   - Gửi Sonnet danh sách rút gọn → trả JSON: `{ intro: string, picks: [id...top 5-8], by_cat: [{cat, ids:[...]}] }`.
   - System prompt: chọn tin quan trọng/nóng nhất, đa dạng danh mục, ngắn gọn; chỉ trả id có thật trong input.
   - Cập nhật `hot_score` cho các bài được pick (boost).
2. `src/jobs/digest-job.ts` — `startDigestCron()` dùng `DIGEST_CRON` (mặc định `0 7 * * *`), TZ từ config. Upsert vào digests theo date.
3. CLI/endpoint trigger thủ công để test (POST /api/digest/rebuild).

## Success
- Chạy buildDigest → 1 record digests hôm nay với picks là id hợp lệ, nhóm theo danh mục.
