# Phase 10 — Docker (web+worker) + deploy + cutover

**Priority:** P1 · **Status:** ⬜ · **Depends:** 08,09

## Mục tiêu
Đóng gói Next.js (standalone) + worker, deploy VPS/Docker, gỡ bản cũ sau khi parity.

## Việc
1. `Dockerfile` (multi-stage): build Next standalone + build worker (esbuild/tsc). 1 image, 2 entrypoint.
2. `docker-compose.yml`: service `web` (`node server.js` của standalone, port 8787) + `worker` (`node dist-worker/worker.js`), chung volume `./data:/app/data`, `env_file .env`, `restart unless-stopped`. Chạy migrate khi web khởi động (hoặc init container).
3. Env: `ANTHROPIC_BASE_URL/AUTH_TOKEN`, models, cron, `DB_PATH=/app/data/7amhub.db`, `TZ`.
4. Cập nhật docs: `docs/system-architecture.md`, `deployment-guide.md`, `codebase-summary.md` cho kiến trúc mới (Next + worker).
5. **Cutover**: khi `app/` đạt parity + chạy Docker OK → xoá `server/` + `web/` (giữ git history), cập nhật README.

## Success
- `docker compose up -d --build` → `http://host:8787` ra app responsive; worker chạy nền; digest 7AM tự tạo; share link bài có OG.

## Validation cuối
- Thêm nguồn RSS mới qua UI → ingest+AI → hiện feed; mở /article/[id] share được; mobile vuốt + desktop reader cùng 1 URL.
