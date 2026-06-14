# Codebase Summary — 7AM Hub

```
7amhub/
├── web/                          # 2 frontend tĩnh (gọi backend qua API_BASE)
│   ├── news-hub.html             # desktop — RSS reader + Feed Manager + "Đề xuất 7AM"
│   └── 7am-feed-app.html         # mobile — feed vuốt dọc + chip "🔥 7AM"
├── server/
│   ├── src/
│   │   ├── index.ts              # Hono app, serve frontend, mount API, bootstrap cron
│   │   ├── lib/
│   │   │   ├── config.ts         # đọc .env (zod), cờ aiEnabled
│   │   │   ├── rel-time.ts       # "3 giờ trước"
│   │   │   ├── local-date.ts     # YYYY-MM-DD theo TZ (khoá digest)
│   │   │   ├── html.ts           # stripHtml, firstImage (parse RSS desc)
│   │   │   ├── hot-score.ts      # điểm "nóng" sơ bộ theo recency
│   │   │   ├── concurrency.ts    # mapLimit (giới hạn song song)
│   │   │   └── serialize.ts      # Article DB → JSON cho frontend
│   │   ├── db/
│   │   │   ├── schema.ts         # sources / articles / digests
│   │   │   ├── client.ts         # better-sqlite3 + drizzle (WAL)
│   │   │   ├── migrate.ts        # áp dụng migrations
│   │   │   └── seed-sources.ts   # 5 nguồn VnExpress mặc định (lần đầu)
│   │   ├── ingest/
│   │   │   ├── rss.ts            # fetch + parse + dedupe + insert
│   │   │   └── extract.ts        # trích toàn văn (readability + fallback)
│   │   ├── ai/
│   │   │   ├── client.ts         # Anthropic SDK, callJSON (forced tool-use + zod)
│   │   │   ├── classify.ts       # Haiku: category + tags + lead + points
│   │   │   └── digest.ts         # Sonnet: bản tin "Đề xuất 7AM"
│   │   ├── jobs/
│   │   │   ├── ingest-job.ts     # cron fetch RSS
│   │   │   ├── ai-worker.ts      # cron xử lý pending → ready
│   │   │   └── digest-job.ts     # cron 07:00 tạo digest
│   │   └── routes/
│   │       ├── articles.ts       # GET /api/articles, /api/articles/:id
│   │       ├── sources.ts        # CRUD /api/sources
│   │       ├── digest.ts         # GET /api/digest/today
│   │       ├── trending.ts       # GET /api/trending
│   │       └── ops.ts            # /api/health, /api/refresh, /api/digest/rebuild
│   ├── drizzle/                  # migrations sinh tự động
│   ├── data/7amhub.db            # SQLite (gitignored)
│   ├── package.json · tsconfig.json · drizzle.config.ts · .env.example
├── Dockerfile · docker-compose.yml · .dockerignore
└── docs/ · plans/
```

## Quy ước
- TypeScript ESM, import kèm đuôi `.js` (NodeNext-style).
- Trường JSON trong DB lưu text, parse khi đọc (`serialize.ts`, `safeJson`).
- Mỗi bài chỉ gọi AI 1 lần (theo `ai_status`), tiết kiệm token.
- Frontend giữ nguyên UI gốc; chỉ thay lớp dữ liệu (proxy/stub → backend).

## Điểm mở rộng
- Thêm nguồn báo khác: dùng Feed Manager (UI) hoặc `POST /api/sources` — AI tự phân loại.
- Đồng bộ read/saved đa thiết bị: thêm bảng + endpoint (hiện localStorage).
- Đổi model AI: sửa `MODEL_FAST` / `MODEL_SMART` trong `.env`.
