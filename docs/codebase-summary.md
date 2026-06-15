# Codebase Summary — 7AM Hub

```
7amhub/
├── app/                              # Next.js 16 App Router (single codebase)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # root layout, providers (theme, query)
│   │   │   ├── page.tsx              # home: HubView (desktop) / FeedView (mobile), SSR initial data
│   │   │   ├── article/[id]/         # SSR chi tiết bài + OG metadata (share link)
│   │   │   └── api/                  # Route handlers
│   │   │       ├── articles/         # GET list, GET :id
│   │   │       ├── sources/          # CRUD
│   │   │       ├── digest/           # GET today, POST rebuild
│   │   │       ├── trending/         # GET tags
│   │   │       ├── ops/              # GET health, POST refresh
│   │   │       ├── saved/            # GET/POST/DELETE server-side saved
│   │   │       └── read/             # GET/POST server-side read state
│   │   ├── components/
│   │   │   ├── hub/                  # HubView (desktop 3-col reader)
│   │   │   ├── feed/                 # FeedView (mobile scroll-snap)
│   │   │   └── ui/                   # shadcn/ui primitives
│   │   ├── hooks/                    # useArticles, useDigest, useSources, useSaved, useTheme
│   │   └── lib/
│   │       ├── config.ts             # đọc env (zod), cờ aiEnabled
│   │       ├── categories.ts         # danh mục cố định
│   │       ├── serialize.ts          # DB row → JSON cho client
│   │       ├── rel-time.ts           # "3 giờ trước"
│   │       ├── local-date.ts         # YYYY-MM-DD theo TZ
│   │       ├── hot-score.ts          # điểm "nóng" sơ bộ theo recency
│   │       ├── html.ts               # stripHtml, firstImage
│   │       ├── utils.ts              # cn(), misc
│   │       ├── concurrency.ts        # mapLimit
│   │       ├── db/
│   │       │   ├── schema.ts         # sources (rss|youtube) / articles / digests / saved / read
│   │       │   ├── client.ts         # better-sqlite3 + drizzle (WAL)
│   │       │   ├── migrate.ts        # áp dụng migrations (drizzle)
│   │       │   └── seed-sources.ts   # 5 nguồn VnExpress + 1 YouTube channel mặc định (lần đầu)
│   │       ├── ingest/
│   │       │   ├── rss.ts            # fetch + parse RSS (hỗ trợ media:group từ YouTube) + dedupe + insert
│   │       │   └── extract.ts        # trích toàn văn (readability + fallback, bỏ qua YouTube watch URL)
│   │       ├── ai/
│   │       │   ├── client.ts         # Anthropic SDK, callJSON (forced tool-use + zod)
│   │       │   ├── classify.ts       # Haiku: category + tags + lead + points
│   │       │   └── digest.ts         # Sonnet: bản tin "Đề xuất 7AM"
│   │       └── jobs/
│   │           ├── ingest-job.ts     # cron fetch RSS
│   │           ├── ai-worker.ts      # cron xử lý pending → ready
│   │           └── digest-job.ts     # cron 07:00 tạo digest
│   ├── worker.ts                     # entry point worker process (cron jobs)
│   ├── drizzle/                      # SQL migrations (sinh tự động)
│   ├── tailwind.config.ts            # design tokens: parchment, terracotta, Georgia
│   ├── components.json               # shadcn/ui config
│   ├── drizzle.config.ts
│   ├── next.config.ts                # output: standalone, remotePatterns
│   └── package.json · tsconfig.json · .env.local.example
├── data/                             # SQLite DB (gitignored, mount volume Docker)
│   └── 7amhub.db
├── Dockerfile                        # multi-stage: deps → builder (Next) → runtime
├── docker-compose.yml                # services: web + worker, shared data volume
├── .dockerignore
└── docs/ · plans/
```

## Quy ước
- Next.js App Router, TypeScript, Tailwind v4 + shadcn/ui (Radix primitives).
- Design tokens: parchment `#f5f4ed`, terracotta `#c96442`, Georgia serif — đặt trong `tailwind.config.ts` + CSS vars.
- SQLite WAL mode: worker ghi chính, web đọc nhiều → không conflict.
- Mỗi bài chỉ gọi AI 1 lần (theo `ai_status`), tiết kiệm token.
- Saved/read state server-side (bảng `saved_articles`, `read_articles`) — đa thiết bị, không auth.
- 2 layouts theo breakpoint: `md:` trở lên → HubView (desktop 3-col); mobile → FeedView (scroll-snap).
- Bài YouTube: UI hiển thị tab "▶ Xem video" (iframe embed thay vì nội dung), thumbnail có play-badge overlay.

## Điểm mở rộng
- Thêm nguồn báo: dùng Feed Manager (UI) hoặc `POST /api/sources` — hỗ trợ RSS URL hoặc YouTube channel URL → AI tự phân loại.
- Đổi model AI: sửa `MODEL_FAST` / `MODEL_SMART` trong `.env.local`.
- Auth đa người dùng: thêm bảng user_id vào `saved_articles`/`read_articles` + auth middleware (future).
