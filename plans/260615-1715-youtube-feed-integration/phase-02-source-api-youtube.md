---
phase: 2
title: "Source API YouTube"
status: completed
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Source API YouTube

## Overview

Nâng cấp `POST /api/sources` để nhận YouTube channel URL (`@handle`, `/channel/UCxxx`), tự resolve thành RSS URL, và ghi `type='youtube'` khi insert.

## Requirements

- Chấp nhận: `https://www.youtube.com/@handle`, `/channel/UCxxx`, hoặc RSS URL trực tiếp
- Resolve `@handle` → RSS URL bằng cách scrape channel page, extract `<link rel="alternate" type="application/rss+xml">`
- Insert source với `type = 'youtube'`
- Fallback: nếu scrape thất bại → 400 với hướng dẫn paste RSS URL trực tiếp

## Architecture

YouTube channel pages embed: `<link rel="alternate" type="application/rss+xml" href="https://www.youtube.com/feeds/videos.xml?channel_id=UCxxx">` — fetch page → regex extract href.

## Related Code Files

- Modify: `app/src/app/api/sources/route.ts`

## Implementation Steps

1. Thêm `isYouTubeChannelUrl(url: string): boolean` helper:
```ts
function isYouTubeChannelUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'www.youtube.com' &&
      (u.pathname.startsWith('/@') || u.pathname.startsWith('/channel/')) &&
      !u.pathname.includes('feeds');
  } catch { return false; }
}
```

2. Thêm `resolveYouTubeRssUrl(channelUrl: string): Promise<string | null>` helper:
```ts
async function resolveYouTubeRssUrl(channelUrl: string): Promise<string | null> {
  try {
    const res = await fetch(channelUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 7AMHubBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/type="application\/rss\+xml"[^>]*href="([^"]+feeds\/videos\.xml[^"]*)"/);
    return match ? match[1] : null;
  } catch { return null; }
}
```

3. Trong `POST` handler sau `normalizeUrl(parsed.data.url)`, thêm YouTube detection:
```ts
let resolvedUrl = url;
let sourceType: 'rss' | 'youtube' = 'rss';

if (isYouTubeChannelUrl(url)) {
  const rssUrl = await resolveYouTubeRssUrl(url);
  if (!rssUrl) return NextResponse.json(
    { error: "Không resolve được RSS từ channel này. Thử paste URL dạng: youtube.com/feeds/videos.xml?channel_id=..." },
    { status: 400 }
  );
  resolvedUrl = rssUrl;
  sourceType = 'youtube';
} else if (url.includes('youtube.com/feeds/videos.xml')) {
  sourceType = 'youtube';
}
```

4. Thay tất cả `url` → `resolvedUrl` trong phần còn lại của hàm `POST` (probe.parseURL, duplicate check, insert).

5. Thêm `type: sourceType` vào object `row` khi `db.insert(sources)`.

## Success Criteria

- [ ] POST với `https://www.youtube.com/@duyluandethuong` → resolve thành công, source insert với `type='youtube'`
- [ ] POST với RSS URL trực tiếp `feeds/videos.xml?channel_id=...` → `type='youtube'`
- [ ] POST với VnExpress URL → `type='rss'` (không bị ảnh hưởng)
- [ ] Scrape fail → 400 với hướng dẫn rõ ràng
- [ ] GET `/api/sources` trả field `type` trong mỗi object

## Risk Assessment

Medium — YouTube page có thể đổi markup.
Mitigation: fallback message hướng dẫn paste RSS URL trực tiếp, user không bị blocked.
