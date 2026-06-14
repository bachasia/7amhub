# Migrate 7AM Hub → Next.js + React (single codebase, responsive)

**Created:** 2026-06-14 · **Status:** Planning

## Mục tiêu
Thay 2 file HTML tĩnh bằng **một codebase Next.js (App Router, TS)** responsive: mobile = feed vuốt, desktop = reader 3 cột, **dùng chung component + data layer**. Giữ AI pipeline + RSS + cron đã chạy tốt, **port logic gần 1:1** (không viết lại).

## Quyết định đã chốt
- **Một codebase Next.js**: FE (SSR) + API route handlers. **Cron tách worker process riêng** cùng repo, dùng chung `lib/` (db/rss/ai) → không chèn việc nặng vào request.
- **Layout**: 2 trải nghiệm theo breakpoint, **chung components/hooks** (FeedView mobile ⟷ HubView desktop).
- **Styling**: Tailwind + shadcn/ui, **port design tokens** (parchment `#f5f4ed`, terracotta `#c96442`, Georgia serif) vào theme + CSS vars; dark mode bằng class.
- **SSR**: trang chi tiết bài render server-side (SEO + share link có ảnh/tiêu đề). Deploy **VPS/Docker** cạnh DB.

## Kiến trúc đích
```
app/ (Next.js, 1 repo)
├── src/app/
│   ├── layout.tsx, globals.css, providers (theme, query)
│   ├── page.tsx                  # Home responsive (mặc định tab Đề xuất 7AM), SSR initial data
│   ├── article/[id]/page.tsx     # SSR chi tiết bài + generateMetadata (og:image/title)
│   └── api/{articles,sources,digest,trending,ops}/route.ts
├── src/components/               # ArticleCard, ArticleRow, ReaderModal, SourceSidebar,
│   │                               CategoryChips, TrendingPanel, DigestView, FeedView, HubView
├── src/lib/
│   ├── db/{schema,client,migrate}.ts     ← port từ server/src/db
│   ├── ingest/{rss,extract}.ts           ← port
│   ├── ai/{client,classify,digest}.ts    ← port
│   ├── jobs/{ingest,ai-worker,digest}.ts ← port (dùng bởi worker + /api/refresh)
│   ├── serialize.ts, config.ts, rel-time.ts, hot-score.ts, html.ts
├── src/hooks/{useArticles,useDigest,useSources,useSaved,useTheme}.ts
├── worker.ts                     # node-cron: ingest/ai/digest — process riêng
├── tailwind.config.ts, components.json (shadcn), drizzle.config.ts
├── Dockerfile, docker-compose.yml (web + worker, chung volume data/)
```

## Tái sử dụng từ bản hiện tại
| Giữ gần như 1:1 | Viết lại (React hoá) |
|---|---|
| db schema, client, migrations | render `innerHTML` → JSX components |
| rss.ts, extract.ts (DOM walker, og:image, selectors) | event handlers → hooks/state |
| ai/client, classify, digest | CSS inline → Tailwind + tokens |
| jobs (ingest/ai-worker/digest) | localStorage logic → hooks |
| serialize, hot-score, rel-time, config | |

## Phases
| # | Phase | Status |
|---|---|---|
| 01 | [Scaffold Next.js + Tailwind + shadcn + design tokens](phases/phase-01-scaffold-nextjs.md) | ⬜ |
| 02 | [Port backend lib (db/ingest/ai/jobs) + migrations](phases/phase-02-port-backend-lib.md) | ⬜ |
| 03 | [API route handlers (parity REST hiện tại)](phases/phase-03-api-route-handlers.md) | ⬜ |
| 04 | [Worker process (cron ingest/AI/digest)](phases/phase-04-worker-process.md) | ⬜ |
| 05 | [Data layer: hooks + types dùng chung](phases/phase-05-data-layer-hooks.md) | ⬜ |
| 06 | [Components dùng chung + HubView (desktop reader)](phases/phase-06-desktop-hubview.md) | ⬜ |
| 07 | [FeedView (mobile vuốt) + responsive switch](phases/phase-07-mobile-feedview.md) | ⬜ |
| 08 | [SSR chi tiết bài + SEO metadata + reader](phases/phase-08-ssr-article-seo.md) | ⬜ |
| 09 | [Theme, saved/read, digest mặc định, parity rà soát](phases/phase-09-state-parity.md) | ⬜ |
| 10 | [Docker (web+worker) + deploy + docs + gỡ bản cũ](phases/phase-10-deploy-cutover.md) | ⬜ |

## Nguyên tắc cutover
- Làm trong thư mục mới (vd `app/`), **không xoá `server/` + `web/`** cho tới khi parity đạt.
- Mỗi phase chạy được + so sánh với bản cũ trước khi sang phase sau.
- Giữ DB SQLite hiện có (`data/7amhub.db`) — schema không đổi, dùng lại dữ liệu đã AI hoá.

## Rủi ro
- shadcn mặc định nhiều token riêng → phải map cẩn thận sang "Claude design system" để không lệch nhận diện.
- SQLite + 2 process (web/worker) ghi đồng thời: bật WAL (đã có) + ghi chủ yếu ở worker, web đọc nhiều → ổn.
- Feed vuốt (scroll-snap) trên mobile cần test kỹ trên Next.js hydration.

## Quyết định bổ sung
- **saved/read đồng bộ server-side** (đa thiết bị). Single-user, **không auth** → kho chung toàn cục: bảng `saved_articles`, `read_articles`. Auth = future nếu mở đa người dùng.

## Unresolved
- Monorepo (pnpm workspace tách `packages/core`) hay single Next.js app chứa `lib/`? (mặc định: single app, đơn giản).
