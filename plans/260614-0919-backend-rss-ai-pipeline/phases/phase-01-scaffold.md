# Phase 01 — Scaffold dự án

**Priority:** P0 · **Status:** ⬜

## Mục tiêu
Khởi tạo `server/` Node + TS chạy được Hono "hello", cài deps, config env, Docker base.

## Việc làm
1. `server/package.json` — type:module, scripts: dev (tsx watch), build (tsc), start, db:gen, db:migrate.
2. Deps: `hono @hono/node-server drizzle-orm better-sqlite3 rss-parser @mozilla/readability linkedom @anthropic-ai/sdk node-cron zod dotenv`. Dev: `typescript tsx drizzle-kit @types/node @types/better-sqlite3`.
3. `tsconfig.json` — ESNext, moduleResolution bundler, strict, outDir dist.
4. `src/lib/config.ts` — load .env qua zod: `PORT, ANTHROPIC_API_KEY, INGEST_CRON, DIGEST_CRON, TZ, DB_PATH, MODEL_FAST, MODEL_SMART`.
5. `src/index.ts` — Hono app, GET /health, @hono/node-server listen.
6. `.env.example`, `.gitignore` (node_modules, data/*.db, dist, .env).

## Success
- `npm run dev` → `GET /health` trả `{ok:true}`.
- `npm run build` không lỗi type.

## Files
- Tạo: toàn bộ `server/` skeleton ở trên.
