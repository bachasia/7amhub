# Deployment Guide — 7AM Hub

## Yêu cầu
- Node.js 20+ (chạy local) hoặc Docker (deploy VPS)
- `ANTHROPIC_API_KEY` (để bật AI phân loại/tóm tắt/digest)

## 1. Chạy local (dev)
```bash
cd app
cp .env.local.example .env.local    # điền ANTHROPIC_API_KEY
npm install
npm run db:migrate                   # tạo data/7amhub.db
npm run dev:all                      # Next.js :3000 + worker song song
```
- Desktop/Mobile: http://localhost:3000
- Health: http://localhost:3000/api/health

Khi mới chạy, tin sẽ ở `pending` vài phút trong lúc AI worker xử lý. Bấm **Làm mới** để fetch + xử lý ngay, hoặc `curl -X POST localhost:3000/api/refresh`.

## 2. Docker (khuyến nghị cho VPS)
```bash
cp app/.env.local.example app/.env   # điền ANTHROPIC_API_KEY
docker compose up -d --build
docker compose logs -f web           # theo dõi Next.js server
docker compose logs -f worker        # theo dõi cron ingest/AI/digest
```
- App: http://host:8787 (desktop + mobile responsive)
- Đổi cổng: đặt `PORT` trong shell trước `docker compose up` (mặc định 8787)
- SQLite mount ra `./data` trên host → dữ liệu bền vững qua restart

## 3. Cấu hình (`app/.env` hoặc `app/.env.local`)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | API key Anthropic chính thức (cách A) |
| `ANTHROPIC_BASE_URL` | — | URL gateway custom tương thích Anthropic, vd `http://host:port/v1` (cách B) |
| `ANTHROPIC_AUTH_TOKEN` | — | token Bearer cho gateway custom (cách B). Cần API_KEY **hoặc** AUTH_TOKEN để bật AI |
| `MODEL_FAST` | claude-haiku-4-5-20251001 | model phân loại/tóm tắt |
| `MODEL_SMART` | claude-sonnet-4-6 | model digest |
| `INGEST_CRON` | `*/15 * * * *` | tần suất fetch RSS |
| `AI_WORKER_CRON` | `*/2 * * * *` | tần suất xử lý AI batch |
| `DIGEST_CRON` | `0 7 * * *` | giờ tạo "Đề xuất 7AM" |
| `TZ` | Asia/Saigon | timezone cho cron + digest date |
| `DB_PATH` | ./data/7amhub.db | đường dẫn SQLite |

## 4. Kiểm tra sau deploy
```bash
curl localhost:8787/api/health           # {ok, articles, pending, aiEnabled:true}
curl -X POST localhost:8787/api/refresh  # ép fetch + AI
curl "localhost:8787/api/articles?limit=3"
curl -X POST localhost:8787/api/digest/rebuild
curl localhost:8787/api/digest/today
```

## 5. Sự cố thường gặp
- **aiEnabled:false** → chưa đặt `ANTHROPIC_API_KEY` trong `app/.env`.
- **articles nhiều, ready ít** → AI worker đang chạy dần (2'/batch) hoặc lỗi key. Xem `docker compose logs worker`.
- **better-sqlite3 lỗi build** → image Docker đã cài python3/make/g++; nếu chạy local cần Xcode CLT (macOS) hoặc build-essential (Linux).
- **worker không thấy DB** → đảm bảo `./data` volume mount đúng; web chạy migrations trước khi worker bắt đầu.
