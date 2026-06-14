# Phase 06 — Components dùng chung + HubView (desktop reader)

**Priority:** P0 · **Status:** ⬜ · **Depends:** 05

## Mục tiêu
Dựng component tái dùng + tái hiện giao diện desktop (news-hub) bằng React.

## Components (shared)
- `ArticleRow` (list desktop), `ArticleCard` (card mobile) — dùng chung `Tag`, `SourceFavicon`, `SaveButton`.
- `SourceSidebar` (tất cả nguồn + count ready, active state).
- `CategoryChips`, `SortChips`.
- `TrendingPanel` (topics + featured; cursor pointer + active như đã fix).
- `DigestView` (Đề xuất 7AM: intro + picks + byCat).
- `ReaderModal` (tab Tóm tắt AI / Bài gốc; render `content` blocks: `<p>` + `<img>`).
- `FeedManagerDialog` (CRUD nguồn).

## HubView (desktop, ≥1024)
- 3 cột: SourceSidebar | feed (list + tabs Đề xuất/Dòng tin/Đã lưu) | TrendingPanel.
- Tabs: **Đề xuất 7AM mặc định** (đặt đầu, active).
- Tích hợp đầy đủ: search, sort, cat chips, load-more (server pagination), reader, feed manager.

## Success
- Desktop parity với `web/news-hub.html` (kể cả các fix: server-driven sidebar, favicon siteUrl, ảnh bài gốc, topic active).
