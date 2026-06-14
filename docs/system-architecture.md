# System Architecture — 7AM Hub

## Tổng quan
Backend Node/TS phục vụ 2 frontend tĩnh và chạy 3 cron job nền. SQLite làm kho dữ liệu duy nhất.

```
                      ┌────────────────────────── server (Hono) ──────────────────────────┐
nguồn RSS ─cron 15'─▶ │ ingest (rss-parser) → articles(pending)                            │
                      │      │                                                             │
                      │   cron 2'  ai-worker: extract toàn văn → Haiku phân loại+tag+tóm tắt│
                      │      ▼                                                             │
                      │ articles(ready) ──── REST /api ────▶  news-hub.html  /  feed-app   │
                      │      │                                                             │
                      │ cron 07:00  digest: Sonnet chọn tin nóng → digests(date)           │
                      └────────────────────────────────────────────────────────────────────┘
```

## Luồng dữ liệu
1. **Ingest** (`src/ingest/rss.ts`, cron `INGEST_CRON`): fetch nguồn active → parse → dedupe theo `id` (guid||link) → insert `articles` (ai_status=`pending`).
2. **AI worker** (`src/jobs/ai-worker.ts`, cron `AI_WORKER_CRON`): lấy batch pending → `extractFullText` nếu thiếu → `analyzeArticle` (Haiku, 1 lần) → set category/tags/lead/points/hot_score, ai_status=`ready`. Lỗi: tăng `ai_tries`, tối đa 3 lần → `failed`.
3. **Digest** (`src/ai/digest.ts`, cron `DIGEST_CRON` 07:00): bài `ready` trong 24h → Sonnet chọn picks + nhóm theo danh mục → lưu `digests` theo ngày, boost hot_score cho picks.
4. **API** phục vụ frontend (chỉ trả bài `ready`).

## Bảng dữ liệu (SQLite, `src/db/schema.ts`)
- **sources**: `id, label, url(unique), active, created_at`
- **articles**: `id, source_id, title, url, raw_summary, image, full_text, published_at, fetched_at, category, tags(JSON), ai_lead, ai_points(JSON), hot_score, ai_status(pending|ready|failed), ai_tries`
- **digests**: `date(PK YYYY-MM-DD), payload(JSON {intro,picks[],byCat[]}), created_at`

## REST API (prefix `/api`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/articles?cat&source&q&sort&offset&limit` | danh sách bài ready (lọc/tìm/phân trang) |
| GET | `/articles/:id` | chi tiết + `paragraphs` (toàn văn, trích lazy) |
| GET | `/sources` | danh sách nguồn + số bài |
| POST | `/sources` `{label,url}` | thêm nguồn (xác minh RSS hợp lệ) |
| PUT/DELETE | `/sources/:id` | sửa / xoá nguồn |
| GET | `/digest/today?date` | bản tin "Đề xuất 7AM" (hydrate article) |
| GET | `/trending?limit` | tag nổi bật theo tần suất |
| GET | `/health` | trạng thái: tổng bài, pending, aiEnabled |
| POST | `/refresh` | fetch RSS + xử lý AI ngay |
| POST | `/digest/rebuild` | build lại digest hôm nay |

## Mô hình AI
- **Haiku** (`MODEL_FAST`): phân loại + tag + tóm tắt mỗi bài. Forced tool-use → JSON validate bằng zod. Mỗi bài xử lý **1 lần** (tối ưu chi phí).
- **Sonnet** (`MODEL_SMART`): tổng hợp digest hằng ngày. Lọc id ảo trước khi lưu.
- Thiếu API key → toàn bộ phần AI tắt mềm (server vẫn chạy, tin ở pending).

## Cron & timezone
`INGEST_CRON` (mặc định 15'), `AI_WORKER_CRON` (2'), `DIGEST_CRON` (07:00), theo `TZ` (Asia/Saigon). Cấu hình qua `.env`.
