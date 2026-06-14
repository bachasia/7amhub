# Phase 05 — Data layer: hooks + types dùng chung

**Priority:** P0 · **Status:** ⬜ · **Depends:** 03

## Mục tiêu
Lớp dữ liệu client tái dùng cho cả mobile/desktop; type ApiArticle dùng chung FE↔BE.

## Việc
1. Export types từ `lib/serialize.ts` (ApiArticle) + digest payload → dùng ở components (type-safe).
2. Cân nhắc TanStack Query (khuyến nghị) cho cache/refetch; hoặc hooks fetch thủ công.
3. Hooks:
   - `useArticles({source,cat,q,sort,limit})` → list + total + loadMore
   - `useDigest()` → /api/digest/today
   - `useSources()` → list + mutations (add/edit/delete)
   - `useTrending()`
   - `useSaved()` / `useRead()` → **gọi API server (đồng bộ đa thiết bị)**: GET ban đầu + optimistic toggle qua POST/DELETE; tab "Đã lưu" lấy article objects từ `/api/saved`
   - `useTheme()` → data-theme + persist
4. `apiBase`: same-origin ('') vì Next.js serve cả API.

## Success
- Gọi hooks trong 1 trang demo → render danh sách tin thật từ DB.
