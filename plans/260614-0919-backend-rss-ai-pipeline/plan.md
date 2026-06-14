# 7AM Hub — Backend + RSS + AI Pipeline

**Created:** 2026-06-14 · **Status:** ✅ Implemented (9/9 phase) — chờ ANTHROPIC_API_KEY để test AI end-to-end

## Mục tiêu
Một backend chung phục vụ 2 frontend (mobile `7am-feed-app.html`, desktop `news-hub.html`).
Người dùng **chỉ nhập nguồn RSS**; backend tự động:
- Fetch RSS server-side (bỏ proxy công cộng, hết lỗi CORS/limit).
- AI **phân loại danh mục + gắn tag + tóm tắt** từng bài (Claude Haiku).
- Mỗi sáng (7AM) tổng hợp **tin nóng + đề xuất** theo danh mục (Claude Sonnet).

## Stack (đã chốt)
- **Runtime:** Node.js 20 + TypeScript
- **Web:** Hono (REST API)
- **DB:** SQLite + Drizzle ORM (migrations)
- **RSS:** rss-parser · **Full-text:** @mozilla/readability + linkedom
- **AI:** @anthropic-ai/sdk — Haiku 4.5 (per-article), Sonnet 4.6 (digest)
- **Lịch:** node-cron · **Validate:** zod
- **Deploy:** Docker (VPS hoặc local)

## Kiến trúc luồng
```
RSS sources ──(cron 15') ──▶ ingest ──▶ articles(pending)
                                          │
                          extract full-text (readability)
                                          │
                          AI worker (Haiku): category + tags + summary
                                          │
                                   articles(ready) ──▶ REST API ──▶ 2 frontends
                                          │
                       cron 07:00 ──▶ digest (Sonnet): tin nóng + đề xuất ──▶ /api/digest/today
```

## Phases
| # | Phase | Trạng thái |
|---|-------|-----------|
| 01 | [Scaffold dự án (Node/TS/Hono/Drizzle/Docker)](phases/phase-01-scaffold.md) | ✅ |
| 02 | [DB schema + migrations](phases/phase-02-database.md) | ✅ |
| 03 | [RSS ingestion + cron](phases/phase-03-rss-ingestion.md) | ✅ (test: 240 bài, dedupe OK) |
| 04 | [Full-text extraction](phases/phase-04-fulltext-extraction.md) | ✅ (test: 12 đoạn VnExpress) |
| 05 | [AI pipeline (Haiku): classify + tag + summary](phases/phase-05-ai-pipeline.md) | ✅ code (cần key để test) |
| 06 | [Daily digest (Sonnet) + cron 7AM](phases/phase-06-daily-digest.md) | ✅ code (cần key để test) |
| 07 | [REST API (articles/sources/digest/trending)](phases/phase-07-rest-api.md) | ✅ (test: health/articles/sources OK) |
| 08 | [Tích hợp 2 frontend vào backend](phases/phase-08-frontend-integration.md) | ✅ (test: serve / + /mobile = 200) |
| 09 | [Docker compose + deploy + docs](phases/phase-09-deploy-docs.md) | ✅ (build tsc OK) |

## Quyết định chính
- **read/saved**: v1 giữ localStorage mỗi thiết bị (YAGNI, không cần auth). Đồng bộ server-side → ghi chú "later".
- **Chi phí AI**: mỗi bài chỉ xử lý **1 lần** (lưu kết quả, không re-process). Haiku batch.
- **Single-user**: không auth ở v1. API mở trong mạng nội bộ/VPS.

## Cấu trúc thư mục dự kiến
```
server/
├── src/
│   ├── index.ts            # Hono app + cron bootstrap
│   ├── db/{schema.ts,client.ts,migrate.ts}
│   ├── ingest/{rss.ts,extract.ts}
│   ├── ai/{classify.ts,summarize.ts,digest.ts,client.ts}
│   ├── routes/{articles.ts,sources.ts,digest.ts,trending.ts}
│   ├── jobs/{ingest-job.ts,digest-job.ts}
│   └── lib/{config.ts,relTime.ts}
├── drizzle/                # migrations
├── data/7amhub.db          # SQLite (gitignored)
├── Dockerfile · docker-compose.yml · package.json · tsconfig.json · .env.example
web/  (2 file HTML hiện tại, sửa fetch trỏ về API)
```

## Unresolved
- Tần suất cron ingest mặc định 15' — ổn chứ? (có thể chỉnh qua .env)
- Giờ digest 07:00 theo Asia/Saigon — đúng ý "7AM" chứ?
