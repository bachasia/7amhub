# System Architecture — 7AM Hub

## Tổng quan
Single Next.js 16 codebase (App Router, TypeScript) phục vụ cả desktop + mobile responsive. Worker process riêng chạy cron jobs nặng (RSS ingest, AI classify, digest). Hai process dùng chung SQLite qua `lib/` (WAL mode).

```
                      ┌─────────────────────── worker (node-cron) ────────────────────────┐
nguồn RSS ─cron 15'─▶ │ ingest (rss-parser) → articles(pending)                            │
                      │       │                                                            │
                      │  cron 2'  ai-worker: extractFullText → Haiku classify+tag+summary  │
                      │       ▼                                                            │
                      │  articles(ready)                                                   │
                      │       │                                                            │
                      │  cron 07:00  digest: Sonnet picks tin nóng → digests(date)        │
                      └────────────────────────────────────────────────────────────────────┘
                                          │ SQLite (WAL)
                      ┌─────────────────── Next.js web (App Router) ───────────────────────┐
                      │  API routes /api/{articles,sources,digest,trending,ops,saved,read}  │
                      │  SSR: /article/[id] (OG metadata, share link)                      │
                      │  UI: HubView (desktop 3-col) / FeedView (mobile scroll-snap)        │
                      │  port :3000 → mapped :8787 via docker-compose                      │
                      └────────────────────────────────────────────────────────────────────┘
```

## Luồng dữ liệu
1. **Ingest** (`src/lib/ingest/rss.ts`, cron `INGEST_CRON`): fetch nguồn active → parse RSS → dedupe theo `id` (guid||link) → insert `articles` (ai_status=`pending`). YouTube feed: trích media:group (thumbnail, description) để bổ sung image/rawSummary.
2. **AI worker** (`src/lib/jobs/ai-worker.ts`, cron `AI_WORKER_CRON`): lấy batch pending → `extractFullText` nếu thiếu (YouTube bỏ qua Readability) → `analyzeArticle` (Haiku, 1 lần) → set category/tags/lead/points/hot_score, ai_status=`ready`. Lỗi: tăng `ai_tries`, tối đa 3 lần → `failed`.
3. **Digest** (`src/lib/ai/digest.ts`, cron `DIGEST_CRON` 07:00): bài `ready` trong 24h → Sonnet chọn picks + nhóm theo danh mục → lưu `digests` theo ngày, boost hot_score cho picks.
4. **API** (`app/api/*/route.ts`) phục vụ React components + SSR (chỉ trả bài `ready`).
5. **SSR** (`app/article/[id]/page.tsx`): render server-side với OG metadata đầy đủ (title, image) cho share link.

## Bảng dữ liệu (SQLite, `src/lib/db/schema.ts`)
- **sources**: `id, label, sublabel, url(unique), siteUrl, active, type(rss|youtube), group, createdAt` — hỗ trợ RSS feed và YouTube channel (lưu lại dạng feeds/videos.xml); `group` (nullable) cho phép user gán feed vào folder; `sublabel` tạo tự động khi 2+ feed cùng base label.
- **articles**: `id, source_id, title, url, raw_summary, image, full_text, published_at, fetched_at, category, tags(JSON), ai_lead, ai_points(JSON), hot_score, ai_status(pending|ready|failed), ai_tries`
- **digests**: `date(PK YYYY-MM-DD), payload(JSON {intro,picks[],byCat[]}), created_at`
- **saved_articles**: `article_id(PK), saved_at` — server-side saved (đa thiết bị)
- **read_articles**: `article_id(PK), read_at` — server-side read state

## REST API (`/api/*`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/articles?cat&source&q&sort&offset&limit` | danh sách bài ready |
| GET | `/api/articles/:id` | chi tiết + paragraphs |
| GET | `/api/sources` | danh sách nguồn + số bài |
| POST | `/api/sources` | thêm nguồn: {label, url, group?} — YouTube channel → resolve RSS; `group` (optional) gán vào folder |
| PUT | `/api/sources/:id` | sửa nguồn: {label?, url?, group?} — omit field → giữ nguyên; "" → null (xóa folder) |
| DELETE | `/api/sources/:id` | xoá nguồn |
| GET | `/api/digest/today?date` | bản tin "Đề xuất 7AM" |
| GET | `/api/trending?limit` | tag nổi bật |
| GET | `/api/health` | trạng thái: tổng bài, pending, aiEnabled |
| POST | `/api/refresh` | fetch RSS + xử lý AI ngay |
| POST | `/api/digest/rebuild` | build lại digest hôm nay |
| GET/POST/DELETE | `/api/saved`, `/api/read` | trạng thái saved/read server-side |

## Mô hình AI
- **Haiku** (`MODEL_FAST`): phân loại + tag + tóm tắt mỗi bài. Forced tool-use → JSON validate bằng zod. Mỗi bài xử lý **1 lần** (tiết kiệm token).
- **Sonnet** (`MODEL_SMART`): tổng hợp digest hằng ngày.
- Thiếu API key → AI tắt mềm (server vẫn chạy, tin ở pending).

## Deploy (Docker)
```
docker compose up -d --build
```
- **`web`** container: `npx tsx src/lib/db/migrate.ts && node server.js` (Next standalone, port 3000)
- **`worker`** container: `npx tsx src/lib/db/migrate.ts && npx tsx worker.ts` (cron jobs)
- Volume `./data:/app/data` dùng chung giữa 2 container
- Migrations chạy idempotent khi mỗi container khởi động

## UI — Folder Grouping & Feed-Type Filter
- **Feed Manager Dialog** (`src/components/hub/feed-manager-dialog.tsx`): thêm/sửa nguồn, folder input với <datalist> gợi ý từ `sources.group` đã tồn tại; folder badge (chip) bên cạnh label trong list.
- **Source Sidebar** (`src/components/hub/source-sidebar.tsx`): 
  - Tách nguồn: flat (group=null) hiển thị phẳng, nhóm theo `group` thành folder collapsible (header uppercase, state lưu localStorage `7am.openGroups`, default đóng).
  - Feed-type filter row (All/RSS/Video chips với count) lọc which sources hiển thị trong sidebar (không đụng feed cột giữa).
  - Sublabel: ưu tiên `sublabel` từ DB (tạo tự động khi POST source nếu 2+ feed cùng base label), fallback " · " trong label.

## Cron & timezone
`INGEST_CRON` (mặc định 15'), `AI_WORKER_CRON` (2'), `DIGEST_CRON` (07:00), theo `TZ` (Asia/Saigon).
