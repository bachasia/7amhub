# Deployment Guide — 7AM Hub

## Yêu cầu
- Node.js 20+ (chạy local) hoặc Docker (deploy VPS)
- `ANTHROPIC_API_KEY` (để bật AI phân loại/tóm tắt/digest)

## 1. Chạy local (dev)
```bash
cd server
cp .env.example .env            # điền ANTHROPIC_API_KEY
npm install
npm run db:gen                  # sinh migration (đã có sẵn, chạy nếu đổi schema)
npm run db:migrate              # tạo data/7amhub.db
npm run dev                     # tsx watch, server :8787
```
- Desktop: http://localhost:8787
- Mobile: http://localhost:8787/mobile
- Health: http://localhost:8787/api/health

Khi mới chạy, tin sẽ ở `pending` vài phút trong lúc AI worker xử lý. Bấm **Làm mới** để fetch + xử lý ngay, hoặc `curl -X POST localhost:8787/api/refresh`.

## 2. Build production (không Docker)
```bash
cd server
npm run build                   # ra dist/
node dist/db/migrate.js
WEB_DIR=../web node dist/index.js
```

## 3. Docker (khuyến nghị cho VPS)
```bash
cp server/.env.example server/.env   # điền ANTHROPIC_API_KEY
docker compose up -d --build
docker compose logs -f api           # xem cron ingest/AI/digest
```
- SQLite được mount ra `./data` trên host → dữ liệu bền vững qua restart.
- Đổi cổng: đặt `PORT` trong môi trường shell trước `docker compose up` (mặc định 8787).

## 4. Cấu hình (`server/.env`)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | 8787 | cổng HTTP |
| `ANTHROPIC_API_KEY` | — | API key Anthropic chính thức (cách A) |
| `ANTHROPIC_BASE_URL` | — | URL gateway custom tương thích Anthropic, vd `http://host:port/v1` (cách B) |
| `ANTHROPIC_AUTH_TOKEN` | — | token Bearer cho gateway custom (cách B). Cần API_KEY **hoặc** AUTH_TOKEN để bật AI |
| `MODEL_FAST` | claude-haiku-4-5-20251001 | model phân loại/tóm tắt |
| `MODEL_SMART` | claude-sonnet-4-6 | model digest |
| `INGEST_CRON` | `*/15 * * * *` | tần suất fetch RSS |
| `AI_WORKER_CRON` | `*/2 * * * *` | tần suất xử lý AI |
| `DIGEST_CRON` | `0 7 * * *` | giờ tạo "Đề xuất 7AM" |
| `TZ` | Asia/Saigon | timezone cho cron + digest date |
| `DB_PATH` | ./data/7amhub.db | đường dẫn SQLite |

## 5. Kiểm tra sau deploy
```bash
curl localhost:8787/api/health          # {ok, articles, pending, aiEnabled:true}
curl -X POST localhost:8787/api/refresh  # ép fetch + AI
curl "localhost:8787/api/articles?limit=3"
curl -X POST localhost:8787/api/digest/rebuild
curl localhost:8787/api/digest/today
```

## Sự cố thường gặp
- **aiEnabled:false** → chưa đặt `ANTHROPIC_API_KEY` trong `server/.env`.
- **articles nhiều, ready ít** → AI worker đang chạy dần (2'/batch) hoặc lỗi key. Xem log.
- **better-sqlite3 lỗi build** → image Docker đã cài python3/make/g++; nếu chạy local cần Xcode CLT (macOS) hoặc build-essential (Linux).
