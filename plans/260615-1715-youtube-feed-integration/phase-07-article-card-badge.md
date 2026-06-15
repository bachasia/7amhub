---
phase: 7
title: "Article Card Badge"
status: completed
priority: P2
effort: "30m"
dependencies: [5]
---

# Phase 7: Article Card Badge

## Overview

Thêm play icon badge trên thumbnail của YouTube articles trong `ArticleCard` để người dùng nhận biết card nào là video.

## Requirements

- Badge: hình tròn semi-transparent, icon play (▶), center overlay trên thumbnail
- Chỉ hiển thị khi `article.sourceType === 'youtube'`
- Không ảnh hưởng UX click (badge là visual-only, click vẫn mở modal)

## Related Code Files

- Modify: `app/src/components/feed/article-card.tsx`

## Implementation Steps

1. Tìm chỗ render thumbnail trong `ArticleCard` — phần `article.img && <img .../>` (hoặc placeholder).

2. Wrap thumbnail section trong `position: relative` container nếu chưa có, thêm badge overlay:
```tsx
{article.img && (
  <div style={{ position: "relative" }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={article.img} alt=""
      style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
    {article.sourceType === 'youtube' && (
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <polygon points="5,3 13,8 5,13" />
          </svg>
        </div>
      </div>
    )}
  </div>
)}
```

3. Verify existing thumbnail container already có `position: relative` hoặc add nó — kiểm tra DOM structure trước khi sửa.

## Success Criteria

- [ ] YouTube article card có play badge circle trên thumbnail
- [ ] Badge centered, semi-transparent, không block click
- [ ] VnExpress article cards không có badge
- [ ] Badge hiển thị đúng trên cả mobile (FeedView) và desktop (HubView)

## Risk Assessment

Low — pure visual change.
