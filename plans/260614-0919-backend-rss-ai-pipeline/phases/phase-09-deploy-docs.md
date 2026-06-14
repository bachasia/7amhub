# Phase 09 — Docker compose + deploy + docs

**Priority:** P1 · **Status:** ⬜ · **Depends:** 08

## Việc làm
1. `server/Dockerfile` — node:20-slim, multi-stage (build → runtime), chạy migrate khi start, expose PORT.
2. `docker-compose.yml` — service `api` (build server, volume `./data:/app/data` cho SQLite, env_file .env, restart unless-stopped) + service `web` (nginx serve 2 HTML, hoặc để API serve static `/`).
3. Cho API serve luôn `web/` static để same-origin (đơn giản, hết lo CORS).
4. `.env.example` đầy đủ; hướng dẫn đặt ANTHROPIC_API_KEY.
5. Docs:
   - `docs/system-architecture.md` — sơ đồ luồng + bảng DB + endpoints.
   - `docs/deployment-guide.md` — chạy local (`npm run dev`) + docker (`docker compose up -d`).
   - `docs/codebase-summary.md` — cây thư mục + vai trò file.
   - `README.md` (root) — quickstart.

## Success
- `docker compose up -d` → mở `http://host:PORT/` ra news-hub, `/mobile` ra feed app; cron chạy nền; digest 7AM tạo tự động.

## Validation cuối
- Test: thêm 1 nguồn RSS mới qua UI → sau ingest+AI có tin phân loại đúng → digest hôm sau gồm tin nóng.
