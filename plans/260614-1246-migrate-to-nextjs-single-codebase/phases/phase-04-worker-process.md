# Phase 04 — Worker process (cron)

**Priority:** P0 · **Status:** ⬜ · **Depends:** 02

## Mục tiêu
Process riêng chạy cron (ingest 15' / AI 2' / digest 07:00), **tách khỏi web server**, dùng chung `lib/`.

## Việc
1. `app/worker.ts`: import `startIngestCron/startAiWorkerCron/startDigestCron` + `seedSourcesIfEmpty`; chạy ingest 1 lần khi boot. Giống bootstrap trong `server/src/index.ts` nhưng KHÔNG mở HTTP.
2. Script: `"worker": "tsx app/worker.ts"`, build: `tsc`/`esbuild worker.ts → dist-worker`.
3. Worker + web dùng chung file SQLite (WAL). Ghi chủ yếu ở worker; web đọc + ghi nhẹ (refresh, lazy extract).
4. Dev: chạy `next dev` và `npm run worker` ở 2 terminal (hoặc `concurrently`).

## Lưu ý
- Tránh chạy 2 worker song song (cron trùng) → chỉ 1 instance worker khi deploy.
- `/api/refresh` vẫn gọi `runIngestOnce + processPending` trực tiếp (không phụ thuộc worker) cho thao tác thủ công.

## Success
- Chạy worker → log cron; bài mới được fetch + AI hoá; web thấy ngay qua API.
