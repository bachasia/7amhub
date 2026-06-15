# Brainstorm Report: YouTube Channel Feed Integration

**Date:** 2026-06-15  
**Status:** Approved — ready for planning

---

## Problem Statement

Tích hợp YouTube channel feed (@duyluandethuong và bất kỳ channel nào) vào 7am-feed. Video xuất hiện mixed trong feed chung, embedded player trong reader modal, AI processing giống articles.

---

## Requirements

- **Display:** Embedded YouTube player trong reader modal (iframe)
- **AI processing:** Claude Haiku classify + viTitle + lead (same pipeline)
- **UI placement:** Mixed vào feed chung với play icon badge
- **Scope:** Generalized — bất kỳ YouTube channel nào qua source management UI
- **Schema change:** Yes — `type` column on `sources` table

---

## Approaches Evaluated

| | A (Chosen) | B | C |
|--|--|--|--|
| **Name** | YouTube RSS + type column | URL detection only | YouTube Data API |
| **Schema change** | Yes (1 column) | No | Yes (new table) |
| **Complexity** | Medium | Low | High |
| **Extensible** | ✓ podcast later | ✗ hacky | ✓ but overkill |
| **API key needed** | No | No | Yes |

**Chosen: Approach A** — clean separation, extensible, reuses existing pipeline.

---

## Solution Design

### Architecture Flow

```
User adds "https://www.youtube.com/@channel"
         ↓
Source API: detect YouTube URL → fetch channel page → extract channelId
         ↓ resolve to RSS URL
"youtube.com/feeds/videos.xml?channel_id=UCxxx"
sources.type = 'youtube'
         ↓ Cron 15m (same ingest job)
rss-parser (custom fields: yt:videoId, media:thumbnail, media:description)
         ↓
articles (url=watch?v=, image=thumbnail, rawSummary=description)
         ↓ Cron 2m AI worker
Skip full-text extract → classify with title+description
         ↓
Reader modal: URL matches youtube.com/watch → <iframe embed> + viTitle
Article card: play icon badge on thumbnail
```

### Files to Modify (8 files)

| File | Change |
|------|--------|
| `app/src/lib/db/schema.ts` | Add `type: 'rss' \| 'youtube'` to sources table |
| `app/src/app/api/sources/route.ts` | Auto-detect YouTube URL, resolve `@handle` → `channelId` via page scrape |
| `app/src/lib/ingest/rss.ts` | Custom fields: `yt:videoId`, `media:thumbnail`, `media:description` |
| `app/src/lib/ingest/extract.ts` | Skip Readability extraction if source type = youtube |
| `app/src/lib/serialize.ts` | Expose `sourceType` in `ApiArticle` (JOIN sources) |
| `app/src/components/hub/reader-modal.tsx` | Detect YouTube URL → render `<iframe>` embed |
| `app/src/components/feed/article-card.tsx` | Play icon badge on thumbnail for video articles |
| `app/src/lib/db/seed-sources.ts` | Seed `@duyluandethuong` as default YouTube source |

### Key Technical Decisions

**Channel ID resolution:** `@handle` → fetch `youtube.com/@handle` → extract `channelId` from `<link rel="canonical">` HTML meta. Fallback: user pastes RSS URL directly.

**YouTube RSS fields** (via rss-parser custom fields):
- `yt:videoId` → extract video ID for embed URL
- `media:thumbnail` → article image
- `media:description` → rawSummary for AI

**Embed URL:** `https://www.youtube.com/embed/{videoId}?rel=0`

**Source type detection in UI:** `serialize.ts` JOINs `sources.type` → expose as `article.sourceType` in API response.

---

## Risks

| Risk | Mitigation |
|------|------------|
| `@handle` scrape breaks if YouTube changes markup | Fallback: accept RSS URL directly from user |
| iframe CSP blocked | Add `youtube.com` to `frame-src` in Next.js headers |
| AI cost | ~$0.001/video × 20 vids/week = negligible |

---

## Success Criteria

- [ ] Add YouTube channel URL via existing source management UI → videos appear in feed within 15m
- [ ] Video card shows play icon badge
- [ ] Click video → reader modal shows embedded YouTube player with viTitle
- [ ] AI classifies video category + generates Vietnamese title
- [ ] Removing YouTube source removes its videos from feed

---

## Next Steps

→ `/ck:plan` — phase-by-phase implementation plan
