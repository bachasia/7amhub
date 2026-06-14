# 7AM Hub

Trình đọc tin tức tổng hợp từ RSS, **AI tự động phân loại + gắn tag + tóm tắt** từng bài, và mỗi sáng 7:00 tạo bản tin **"Đề xuất 7AM"** tổng hợp tin nóng. Người dùng chỉ cần nhập nguồn RSS — phần còn lại tự động.

Hai giao diện dùng chung một backend:
- **Desktop** (`/`) — bố cục đọc tin kiểu RSS reader (`web/news-hub.html`)
- **Mobile** (`/mobile`) — feed vuốt dọc toàn màn (`web/7am-feed-app.html`)

## Kiến trúc
```
Nguồn RSS ──cron 15'──▶ ingest ──▶ trích toàn văn ──▶ AI Haiku (phân loại+tag+tóm tắt)
                                                          │
                                          articles ──▶ REST API ──▶ 2 frontend
                                                          │
                              cron 07:00 ──▶ AI Sonnet ──▶ "Đề xuất 7AM" (/api/digest/today)
```
- Backend: Node.js + TypeScript + Hono + SQLite (Drizzle) + node-cron
- AI: Claude Haiku (mỗi bài, 1 lần) + Claude Sonnet (digest hằng ngày)
- Chi tiết: [docs/system-architecture.md](docs/system-architecture.md)

## Chạy nhanh (local)
```bash
cd server
cp .env.example .env          # đặt ANTHROPIC_API_KEY
npm install
npm run db:gen && npm run db:migrate
npm run dev
```
Mở http://localhost:8787 (desktop) hoặc http://localhost:8787/mobile.

## Chạy bằng Docker
```bash
cp server/.env.example server/.env   # đặt ANTHROPIC_API_KEY
docker compose up -d --build
```
Xem [docs/deployment-guide.md](docs/deployment-guide.md).

## Ghi chú
- Không có `ANTHROPIC_API_KEY`: RSS vẫn fetch nhưng tin ở trạng thái `pending` (chưa phân loại/tóm tắt) và không hiển thị ở feed (feed chỉ hiện bài `ready`).
- `read`/`saved` lưu localStorage theo từng thiết bị (v1, chưa đồng bộ đa thiết bị).
