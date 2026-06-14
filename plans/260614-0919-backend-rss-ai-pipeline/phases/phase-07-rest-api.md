# Phase 07 — REST API

**Priority:** P0 · **Status:** ⬜ · **Depends:** 05,06

## Endpoints (Hono, prefix /api)

### Articles
- `GET /api/articles` — query: `cat, source, q, tab(all|saved n/a), sort(latest|unread n/a server), offset, limit`. Trả `{items, total}`; mỗi item kèm `time` (relTime tính server) + source label/favicon host. Chỉ trả `ai_status=ready` (cộng pending nếu muốn hiển thị sớm — mặc định ready).
- `GET /api/articles/:id` — đầy đủ: ai_lead, ai_points, full_text paragraphs (extract on-demand nếu thiếu), url.

### Sources (CRUD)
- `GET /api/sources` — kèm số bài/nguồn.
- `POST /api/sources` `{label,url}` — validate URL, thử fetch 1 lần xác minh RSS hợp lệ, insert.
- `PUT /api/sources/:id` · `DELETE /api/sources/:id` (xoá nguồn → giữ/để bài cũ tuỳ chọn; mặc định giữ).

### Digest / Trending / Ops
- `GET /api/digest/today` (||`?date=`) — payload digest + hydrate article objects từ ids.
- `GET /api/trending` — tần suất tag trên bài ready gần đây (top 7).
- `POST /api/refresh` — trigger ingest + AI worker ngay (cho nút Làm mới).
- `POST /api/digest/rebuild` — build lại digest hôm nay (test).

## Việc làm
1. `src/routes/*.ts` mỗi nhóm 1 file; mcount vào index.ts.
2. CORS mở (hono/cors) cho 2 frontend.
3. zod validate input; lỗi trả 400 JSON.
4. `src/lib/relTime.ts` dùng chung.

## Success
- curl mọi endpoint trả JSON đúng; thêm/xoá nguồn phản ánh ngay ở /api/sources.
