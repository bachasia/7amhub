# Phase 08 — Tích hợp 2 frontend vào backend

**Priority:** P0 · **Status:** ⬜ · **Depends:** 07

## Mục tiêu
2 file HTML dùng chung backend; bỏ proxy công cộng + stub AI client-side.

## news-hub.html (desktop)
- Bỏ `rss2json`/`allorigins`, `aiClassify`, `aiSummarize`, `loadFeeds` parse RSS → thay bằng `fetch(API/api/articles...)`.
- Feed manager → gọi `POST/PUT/DELETE /api/sources`; bỏ ô chọn cat (AI lo).
- Reader: tab "Tóm tắt AI" lấy ai_lead/ai_points từ `/api/articles/:id`; tab "Bài gốc" lấy paragraphs từ cùng response.
- Trending: dùng `/api/trending`.
- read/saved: giữ localStorage.

## 7am-feed-app.html (mobile)
- Thay `loadFeed` (rss2json) bằng `fetch(API/api/articles)`; map field (img, title, summary=ai_lead||summary, source, time, url).
- Hiển thị **ảnh thật** (đã có img từ backend) thay placeholder khi có.
- saved: giữ localStorage.

## Mới: màn "Đề xuất 7AM" (cả 2)
- Section/tab gọi `/api/digest/today`: intro + picks + nhóm theo danh mục → "tin nóng hằng ngày".
- Mobile: thêm vào đầu feed hoặc tab riêng. Desktop: panel/tab "Đề xuất".

## Config
- `API_BASE` đặt 1 chỗ đầu script mỗi file (mặc định `http://localhost:8787` hoặc same-origin nếu serve cùng).

## Success
- Mở 2 file → tin thật có category/tag/tóm tắt từ AI; thêm nguồn RSS mới → tin nguồn đó xuất hiện sau ingest+AI; "Đề xuất 7AM" hiển thị digest.
