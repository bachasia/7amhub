---
phase: 3
title: "RSS YouTube Parsing"
status: completed
priority: P1
effort: "1h"
dependencies: [1]
---

# Phase 3: RSS YouTube Parsing

## Overview

Mở rộng `rss-parser` config để parse YouTube-specific fields (`yt:videoId`, `media:thumbnail`, `media:description`) và extract thumbnail + description vào đúng fields của `ParsedItem`.

## Requirements

- Thumbnail YouTube (`media:thumbnail @url`) → `image`
- Description YouTube (`media:description`) → `rawSummary`
- Video URL (`watch?v=VIDEO_ID`) → `url` (đã hoạt động qua `item.link`)
- Không break parsing RSS thông thường

## Architecture

YouTube Atom feed structure:
```xml
<entry>
  <title>Video Title</title>
  <link href="https://www.youtube.com/watch?v=VIDEO_ID"/>
  <published>2024-01-01T00:00:00+00:00</published>
  <media:group>
    <media:thumbnail url="https://i2.ytimg.com/vi/VIDEO_ID/hqdefault.jpg" width="480" height="360"/>
    <media:description>Video description text...</media:description>
  </media:group>
</entry>
```

`rss-parser` parse `<media:group>` với custom fields → truy cập nested attributes.

## Related Code Files

- Modify: `app/src/lib/ingest/rss.ts`

## Implementation Steps

1. Cập nhật `customFields` trong parser config — thêm YouTube fields:
```ts
const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; 7AMHubBot/1.0)" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:group", "mediaGroup"],          // YouTube groups thumbnail + description
    ],
  },
});
```

2. Trong `parseItem`, thêm YouTube field extraction sau phần image hiện tại:
```ts
// YouTube thumbnail from media:group > media:thumbnail
const ytThumbnail = (item as any).mediaGroup?.["media:thumbnail"]?.[0]?.["$"]?.url
  || (item as any).mediaGroup?.["media:thumbnail"]?.["$"]?.url
  || null;

// YouTube description from media:group > media:description
const ytDesc = (item as any).mediaGroup?.["media:description"]?.[0]
  || (item as any).mediaGroup?.["media:description"]
  || null;
```

3. Ưu tiên YouTube fields trong return value của `parseItem`:
```ts
return {
  id: (item.guid || url).trim(),
  sourceId: src.id,
  title,
  url,
  rawSummary: ytDesc ? String(ytDesc).trim() : (desc || null),
  image: image || ytThumbnail || null,   // existing logic first, YouTube fallback
  publishedAt: Number.isNaN(ts) ? null : ts,
};
```
   **Note:** Đặt `ytThumbnail` sau `image` (fallback) — existing logic (`firstImage(html)`, enclosure, media:content) vẫn ưu tiên cao hơn.

## Success Criteria

- [ ] Sau khi ingest YouTube source, articles có `image` = thumbnail URL (dạng `i2.ytimg.com/vi/.../hqdefault.jpg`)
- [ ] Articles có `rawSummary` = description text từ video
- [ ] Articles có `url` = `youtube.com/watch?v=VIDEO_ID`
- [ ] VnExpress articles không bị ảnh hưởng (parse như cũ)

## Risk Assessment

Low — chỉ thêm custom fields, không thay đổi parse logic cơ bản.
Verify bằng cách fetch một YouTube RSS feed thủ công và log kết quả.
