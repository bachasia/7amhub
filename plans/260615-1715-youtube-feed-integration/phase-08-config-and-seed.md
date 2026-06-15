---
phase: 8
title: "Config and Seed"
status: completed
priority: P2
effort: "30m"
dependencies: [1, 2]
---

# Phase 8: Config and Seed

## Overview

Thêm CSP header cho YouTube iframe embed trong Next.js config, và seed `@duyluandethuong` làm YouTube source mặc định trong `seed-sources.ts`.

## Requirements

- `next.config.ts`: CSP `frame-src` cho phép `youtube.com` và `www.youtube-nocookie.com`
- `seed-sources.ts`: thêm `@duyluandethuong` YouTube channel vào default seeds với `type: 'youtube'`

## Related Code Files

- Modify: `app/next.config.ts` (hoặc `next.config.js`)
- Modify: `app/src/lib/db/seed-sources.ts`

## Implementation Steps

**A. Next.js CSP Headers**

1. Tìm file `app/next.config.ts` — kiểm tra xem có `headers()` config chưa.

2. Thêm/cập nhật `Content-Security-Policy` header để allow YouTube iframe:
```ts
// Trong headers() → matchers → headers array:
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com",  // ADD
    "connect-src 'self'",
  ].join('; ')
}
```
   **Note:** Nếu chưa có CSP config, chỉ thêm `frame-src` là đủ — Next.js default không block iframes.

3. Nếu `next.config.ts` không có `headers()` function, tạo mới:
```ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [{
      key: 'X-Frame-Options-YouTube',  // placeholder — thực ra chỉ cần không set X-Frame-Options restrictive
      value: 'allow',
    }],
  }];
}
```
   **Thực tế:** Next.js mặc định không set CSP, nên iframe sẽ hoạt động ngay. Chỉ cần thêm nếu app đã có CSP restrictive.

**B. Seed Sources**

4. Mở `app/src/lib/db/seed-sources.ts` — đọc structure hiện tại.

5. Thêm YouTube channel vào array seeds. Sau Phase 1, schema có `type` column. Seed cần resolve channel ID trước (one-time manual step):
   - Lấy channel ID của `@duyluandethuong`: truy cập `youtube.com/@duyluandethuong`, view source, tìm `channelId`
   - RSS URL format: `https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxxxx`

6. Thêm vào seeds array:
```ts
{
  id: "yt-duyluandethuong",
  label: "Duy Luân",
  url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_CHANNEL_ID_HERE",
  type: "youtube",
  active: 1,
  createdAt: Date.now(),
}
```
   Thay `UC_CHANNEL_ID_HERE` bằng channel ID thực của `@duyluandethuong`.

**C. Verify CSP**

7. Start dev server → mở reader modal → click "Xem video" → verify iframe load không bị blocked bởi browser console CSP error.

## Success Criteria

- [ ] YouTube iframe embed trong reader modal không bị CSP blocked (kiểm tra browser console)
- [ ] `seed-sources.ts` có entry cho `@duyluandethuong` với đúng channel ID và `type: 'youtube'`
- [ ] Fresh DB seed chạy `npm run seed` (hoặc equivalent) → YouTube source xuất hiện trong sources list
- [ ] Video fetch trong 15 phút sau khi seed

## Risk Assessment

Low — CSP chỉ cần thêm nếu đã có restrictive policy. Seed channel ID cần resolve thủ công một lần.
