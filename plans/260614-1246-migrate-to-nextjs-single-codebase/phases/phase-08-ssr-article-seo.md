# Phase 08 — SSR chi tiết bài + SEO

**Priority:** P1 · **Status:** ⬜ · **Depends:** 03,06

## Mục tiêu
Trang chi tiết bài render server-side để share link/SEO; reader mở từ feed dùng lại nội dung.

## Việc
1. `app/article/[id]/page.tsx` (Server Component): gọi thẳng lib (db + extract lazy) → render bài (lead, points, content blocks).
2. `generateMetadata`: title, description (aiLead), `openGraph.images=[img]`, `twitter:card` → share Facebook/Zalo có ảnh+tiêu đề.
3. Home page SSR initial: digest + trang đầu articles render sẵn (giảm trắng màn), rồi client hydrate cho tương tác.
4. ReaderModal (mở nhanh trong feed) vẫn dùng `/api/articles/[id]`; trang `/article/[id]` là bản full-page chia sẻ được. Link "Mở bài gốc" giữ nguyên ra nguồn.
5. `sitemap.ts` + `robots.ts` (tuỳ chọn) nếu muốn index.

## Success
- Mở `/article/<id>` thẳng → có nội dung trong HTML nguồn (view-source thấy text); dán link vào trình kiểm tra OG thấy ảnh+tiêu đề.
