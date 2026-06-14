# Phase 03 — API route handlers (parity REST)

**Priority:** P0 · **Status:** ⬜ · **Depends:** 02

## Mục tiêu
Tái tạo REST hiện tại bằng Next.js Route Handlers (`app/src/app/api/.../route.ts`), runtime nodejs.

## Endpoints (giữ nguyên hợp đồng)
- `GET /api/articles` (cat,source,q,sort,offset,limit) → `{items,total}` (serialize.ts)
- `GET /api/articles/[id]` → chi tiết + `content` blocks (lazy extract + cache)
- `GET/POST/PUT/DELETE /api/sources` (CRUD, probe RSS, siteUrl)
- `GET /api/digest/today`, `GET /api/trending`
- `GET /api/health`, `POST /api/refresh`, `POST /api/digest/rebuild`
- **Mới — saved/read (single-user toàn cục):**
  - `GET /api/saved` → list id (hoặc kèm article objects để render tab "Đã lưu" đa thiết bị)
  - `POST /api/saved/[id]` / `DELETE /api/saved/[id]` → toggle lưu
  - `GET /api/read` → set id đã đọc · `POST /api/read/[id]` → đánh dấu đã đọc

## Việc
1. Mỗi route export `runtime='nodejs'`, `dynamic='force-dynamic'` (đọc DB realtime).
2. Tái dùng truy vấn từ routes Hono cũ (drizzle như nhau) — chỉ đổi vỏ req/res sang `Request`/`NextResponse`.
3. Bỏ CORS (same-origin). Validate input bằng zod như cũ.
4. Server Components có thể gọi thẳng hàm lib (không cần qua HTTP) cho initial render — API vẫn giữ cho client fetch/refresh.

## Success
- `curl` mọi endpoint giống bản Hono; thêm/xoá nguồn phản ánh ngay.
