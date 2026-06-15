---
title: "YouTube Channel Feed Integration"
description: "Add YouTube channel support to 7am-feed: source type column, channel URL resolution, YouTube RSS parsing, embedded player in reader modal, play badge on cards."
status: completed
priority: P2
branch: "main"
tags: ["youtube", "rss", "feed", "embed"]
blockedBy: []
blocks: []
created: "2026-06-15T10:28:46.596Z"
createdBy: "ck:plan"
source: skill
---

# YouTube Channel Feed Integration

> Brainstorm report: [plans/reports/brainstorm-260615-1715-youtube-feed-integration-report.md](../reports/brainstorm-260615-1715-youtube-feed-integration-report.md)

## Overview

Tích hợp YouTube channel feed vào 7am-feed. Người dùng dán URL channel YouTube (`@handle` hoặc `/channel/UCxxx`) vào source management UI hiện có — backend tự resolve thành RSS URL, fetch video, chạy AI classify, và hiển thị video mixed trong feed chung với embedded player trong reader modal.

## Architecture Flow

```
User adds "https://www.youtube.com/@channel"
         ↓ POST /api/sources
Detect YouTube → scrape channel page → extract RSS URL
         ↓ resolve
"youtube.com/feeds/videos.xml?channel_id=UCxxx"
sources.type = 'youtube'
         ↓ Cron 15m (same ingest job)
rss-parser (custom fields: yt:videoId, media:thumbnail, media:description)
         ↓
articles (url=watch?v=, image=thumbnail, rawSummary=description)
         ↓ Cron 2m AI worker
Skip full-text extract → classify with title+description
         ↓
Reader modal: sourceType=youtube → <iframe embed> + viTitle
Article card: play icon badge on thumbnail
```

## Phases

| Phase | Name | Status | Effort | Files |
|-------|------|--------|--------|-------|
| 1 | [Schema Migration](./phase-01-schema-migration.md) | Done | 30m | `schema.ts` |
| 2 | [Source API YouTube](./phase-02-source-api-youtube.md) | Done | 2h | `api/sources/route.ts` |
| 3 | [RSS YouTube Parsing](./phase-03-rss-youtube-parsing.md) | Done | 1h | `ingest/rss.ts` |
| 4 | [AI Worker Skip Extract](./phase-04-ai-worker-skip-extract.md) | Done | 30m | `jobs/ai-worker.ts` |
| 5 | [Serialize sourceType](./phase-05-serialize-sourcetype.md) | Done | 30m | `lib/serialize.ts` |
| 6 | [Reader Modal Embed](./phase-06-reader-modal-embed.md) | Done | 2h | `hub/reader-modal.tsx` |
| 7 | [Article Card Badge](./phase-07-article-card-badge.md) | Done | 30m | `feed/article-card.tsx` |
| 8 | [Config and Seed](./phase-08-config-and-seed.md) | Done | 30m | `next.config.ts`, `seed-sources.ts` |

**Total estimated effort:** ~7h

## Dependencies

- Phases 2–8 each depend on Phase 1 (schema must be migrated first)
- Phases 6–7 depend on Phase 5 (`sourceType` must be in `ApiArticle`)
