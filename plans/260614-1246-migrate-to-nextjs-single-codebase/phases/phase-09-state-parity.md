# Phase 09 — Theme, saved/read, digest mặc định, rà soát parity

**Priority:** P1 · **Status:** ⬜ · **Depends:** 06,07

## Mục tiêu
Hoàn thiện trạng thái client + đảm bảo bằng/đẹp hơn bản HTML cũ.

## Việc
1. Theme: persist `data-theme` (localStorage), tránh FOUC (script inline set theme trước hydrate).
2. Saved/Read: **đồng bộ server-side** qua `/api/saved` + `/api/read` (single-user toàn cục); optimistic update; tab "Đã lưu" hoạt động đa thiết bị. (Migrate localStorage cũ nếu có: lần đầu đẩy id local lên server.)
3. Digest mặc định (cả mobile chip 🔥 7AM + desktop tab).
4. Toast, loading skeleton (shadcn), empty states.
5. **Checklist parity** so với bản HTML: lọc nguồn/cat server-driven, favicon siteUrl, ảnh bài gốc + og:image thumbnail, DOM-walker extraction (comment/footer sạch), topic active, tóm tắt AI mobile, padding, đồng tông màu/size.

## Success
- Đi hết checklist; không thua bản cũ tính năng nào; thêm SSR/SEO.
