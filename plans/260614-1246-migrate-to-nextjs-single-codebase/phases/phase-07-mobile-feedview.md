# Phase 07 — FeedView (mobile vuốt) + responsive switch

**Priority:** P0 · **Status:** ⬜ · **Depends:** 06

## Mục tiêu
Tái hiện feed vuốt dọc mobile + chuyển layout theo breakpoint trong cùng trang.

## FeedView (mobile, <1024)
- `scroll-snap-y mandatory`, mỗi card full màn (`ArticleCard`): ảnh trên + body màu theo category.
- Body: nhãn "✦ Tóm tắt AI" + lead + points (vùng cuộn `ai-body`, footer cố định) — như đã làm.
- Chips: **🔥 7AM** (digest) đầu, **mặc định active**; rail chấm vị trí; nút lưu/refresh/theme; sheet "Đã lưu".

## Responsive switch
- `page.tsx` render chung data; chọn `<FeedView>` hay `<HubView>` bằng CSS breakpoint (ưu tiên CSS, tránh layout shift) hoặc `useMediaQuery` sau mount.
- Dùng chung hooks/data + ReaderModal + FeedManager.

## Lưu ý
- scroll-snap + Next hydration: đảm bảo không nhảy khi load; test iOS Safari.
- Ảnh card dùng `next/image` (remotePatterns đã khai báo) hoặc `<img>` nếu domain động khó kiểm soát.

## Success
- Thu nhỏ cửa sổ → mobile feed vuốt; phóng to → desktop reader; chung 1 URL, không reload.
