---
phase: 6
title: "Reader Modal Embed"
status: completed
priority: P1
effort: "2h"
dependencies: [5]
---

# Phase 6: Reader Modal Embed

## Overview

Thêm tab "Xem video" vào reader modal cho YouTube articles. Khi `article.sourceType === 'youtube'`, thay tab "Nội dung" bằng "Xem video" — render `<iframe>` embed thay vì fetch full text.

## Requirements

- YouTube articles: tabs = "Tóm tắt AI" | "Xem video" (không có tab "Nội dung")
- Default tab = "ai" (giống hiện tại)
- Tab "Xem video" → render `<iframe src="youtube.com/embed/{videoId}?rel=0">`
- iframe: `allow="autoplay; fullscreen"`, aspect ratio 16/9, full width
- Non-YouTube articles: UI không thay đổi

## Architecture

File: `app/src/components/hub/reader-modal.tsx`

```
tab state: "ai" | "original" | "video"
                                ↑ new

if article.sourceType === 'youtube':
  - tab buttons: ["ai", "video"]
  - tab "video": render iframe embed
  - skip loadDetail() call (no full-text to load)
else:
  - tab buttons: ["ai", "original"]  ← unchanged
```

Video ID extraction: `new URL(article.url).searchParams.get('v')`
Embed URL: `https://www.youtube.com/embed/${videoId}?rel=0`

## Related Code Files

- Modify: `app/src/components/hub/reader-modal.tsx`

## Implementation Steps

1. Mở rộng tab type — sửa `useState`:
```ts
const [tab, setTab] = useState<"ai" | "original" | "video">(initialTab);
```

2. Thêm helper extract video ID — đặt trước `modalContent`:
```ts
const videoId = article.sourceType === 'youtube'
  ? (() => { try { return new URL(article.url).searchParams.get('v'); } catch { return null; } })()
  : null;
```

3. Sửa tab button render — thay thế đoạn `<div style={{ display: "inline-flex", ... }}>` chứa 2 buttons:
```tsx
<div style={{ display: "inline-flex", background: "transparent", border: "1px solid var(--border)", borderRadius: 10, padding: 3, marginBottom: 18 }}>
  <button style={tabStyle(tab === "ai")} onClick={() => setTab("ai")}>✦ Tóm tắt AI</button>
  {article.sourceType === 'youtube'
    ? <button style={tabStyle(tab === "video")} onClick={() => setTab("video")}>▶ Xem video</button>
    : <button style={tabStyle(tab === "original")} onClick={() => setTab("original")}>Nội dung</button>
  }
</div>
```

4. Thêm render block cho tab "video" — ngay sau `{tab === "ai" && (...)}`:
```tsx
{tab === "video" && videoId && (
  <div style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "16/9", background: "#000" }}>
    <iframe
      src={`https://www.youtube.com/embed/${videoId}?rel=0`}
      style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      title={article.viTitle || article.title}
    />
  </div>
)}
```

5. Trong `useEffect` khi tab = "original": guard `article.sourceType !== 'youtube'` trước khi gọi `loadDetail`:
```ts
useEffect(() => {
  if (tab === "original" && article && !detail && article.sourceType !== 'youtube') loadDetail(article.id);
}, [tab, article, detail, loadDetail]);
```

6. Giữ nguyên phần reset tab — `setTab(initialTab)` khi article thay đổi (không cần sửa).

## Success Criteria

- [ ] YouTube article → modal chỉ có 2 tab: "Tóm tắt AI" và "▶ Xem video"
- [ ] Click "▶ Xem video" → iframe YouTube embed hiển thị đúng video
- [ ] AI tab vẫn hiện `viTitle`, `lead`, `points` như bình thường
- [ ] VnExpress article → modal không thay đổi (tab "Nội dung" vẫn có)
- [ ] Iframe có aspect ratio 16/9, full width, borderRadius 8px

## Risk Assessment

Medium — iframe CSP có thể block nếu Next.js config chưa có `frame-src youtube.com`. Phase 8 xử lý CSP header.
