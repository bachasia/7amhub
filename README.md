# 7AM Hub

Trình đọc tin tức tổng hợp từ RSS, **AI tự động phân loại + gắn tag + tóm tắt** từng bài, và mỗi sáng 7:00 tạo bản tin **"Đề xuất 7AM"** tổng hợp tin nóng. Người dùng chỉ cần nhập nguồn RSS — phần còn lại tự động.

Một codebase Next.js responsive:
- **Desktop** — bố cục 3 cột kiểu RSS reader
- **Mobile** — feed vuốt dọc scroll-snap

## Kiến trúc
```
Nguồn RSS ──cron 15'──▶ ingest ──▶ trích toàn văn ──▶ AI Haiku (phân loại+tag+tóm tắt)
                                                          │
                                        articles ──▶ Next.js API routes ──▶ React UI
                                                          │
                              cron 07:00 ──▶ AI Sonnet ──▶ "Đề xuất 7AM" (/api/digest/today)
```
- **Web**: Next.js 16 App Router + TypeScript + Tailwind + shadcn/ui
- **Worker**: process riêng (node-cron) dùng chung `lib/` với web
- **DB**: SQLite (Drizzle, WAL mode)
- **AI**: Claude Haiku (mỗi bài, 1 lần) + Claude Sonnet (digest hằng ngày)
- Chi tiết: [docs/system-architecture.md](docs/system-architecture.md)

## Chạy nhanh (local)
```bash
cd app
cp .env.local.example .env.local   # đặt ANTHROPIC_API_KEY
npm install
npm run db:migrate
npm run dev:all                     # Next.js :3000 + worker song song
```
Mở http://localhost:3000.

## Chạy bằng Docker
```bash
cp app/.env.local.example app/.env   # đặt ANTHROPIC_API_KEY
docker compose up -d --build
```
App: http://host:8787 · Chi tiết: [docs/deployment-guide.md](docs/deployment-guide.md)

## Ghi chú
- Không có `ANTHROPIC_API_KEY`: RSS vẫn fetch nhưng tin ở trạng thái `pending` và không hiển thị ở feed (feed chỉ hiện bài `ready`).
- `read`/`saved` đồng bộ server-side (bảng `saved_articles`, `read_articles`) — dùng được đa thiết bị.
