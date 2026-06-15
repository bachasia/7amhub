---
phase: 5
title: "Feed-type filter row"
status: completed
priority: P2
effort: "1h"
dependencies: [2, 4]
---

# Phase 5: Feed-type filter row

## Overview

Thêm hàng icon lọc loại feed ở đầu sidebar (giống hàng icon trên cùng của Folo): Tất cả / Bài viết (RSS) / Video (YouTube), kèm số đếm nguồn. Click để lọc nguồn hiển thị trong sidebar theo `type`.

## Requirements

- 3 mục: All, RSS (`type==='rss'`), YouTube (`type==='youtube'`), mỗi mục có icon + count số nguồn.
- Click → lọc danh sách feed (flat + folders) còn lại đúng type; folder rỗng sau lọc thì ẩn.
- Trạng thái filter là **local state** trong sidebar (không cần persist — YAGNI).
- Không đụng feed bài viết ở cột giữa.

## Architecture

```
typeFilter: "all" | "rss" | "youtube"  (useState, default "all")
visibleSources = typeFilter==="all" ? sources : sources.filter(s => s.type === typeFilter)
→ splitByFolder(visibleSources)  (Phase 4)
```

## Related Code Files

- Modify: `app/src/components/hub/source-sidebar.tsx`

## Implementation Steps

1. Thêm state:
```ts
const [typeFilter, setTypeFilter] = useState<"all" | "rss" | "youtube">("all");
```

2. Tính counts + danh sách lọc TRƯỚC khi `splitByFolder`:
```ts
const rssCount = sources.filter((s) => s.type !== "youtube").length;
const ytCount = sources.filter((s) => s.type === "youtube").length;
const visible = typeFilter === "all"
  ? sources
  : typeFilter === "youtube"
    ? sources.filter((s) => s.type === "youtube")
    : sources.filter((s) => s.type !== "youtube");
const { flat, folders } = splitByFolder(visible);
```

3. Render hàng icon ngay dưới tiêu đề, trên "Tất cả nguồn". Dùng `lucide-react`: `Rss`, `Youtube`, `LayoutGrid` (hoặc `Globe` cho all):
```tsx
<div style={{ display: "flex", gap: 6, padding: "0 4px 8px" }}>
  {[
    { key: "all", icon: <LayoutGrid size={16} />, n: sources.length },
    { key: "rss", icon: <Rss size={16} />, n: rssCount },
    { key: "youtube", icon: <Youtube size={16} />, n: ytCount },
  ].map(({ key, icon, n }) => (
    <button
      key={key}
      onClick={() => setTypeFilter(key as typeof typeFilter)}
      aria-pressed={typeFilter === key}
      style={typeChipStyle(typeFilter === key)}
    >
      {icon}
      <span style={{ fontSize: 11, fontWeight: 600 }}>{n}</span>
    </button>
  ))}
</div>
```
   `typeChipStyle(active)`: flex column/row gap 4, padding 6px 10px, borderRadius 8, border 1px var(--border), background active → `color-mix(in oklab, var(--primary) 10%, var(--card))`, color active → var(--primary).

4. Đảm bảo folder rỗng sau lọc không hiện header (Phase 4 đã map theo `folders` đã lọc nên tự động ẩn).

## Success Criteria

- [ ] Hàng 3 icon hiển thị với count đúng (All = tổng, RSS, YouTube)
- [ ] Click YouTube → sidebar chỉ còn nguồn youtube; folder không có youtube ẩn
- [ ] Click All → hiện lại tất cả
- [ ] Active state rõ ràng
- [ ] `tsc --noEmit` + build pass

## Risk Assessment

Low — local state + filter array. Không persist (YAGNI).

## Unresolved questions

- Nếu sau này có thêm loại feed (podcast/ảnh), hàng icon cần mở rộng — hiện chỉ rss/youtube theo schema. Chấp nhận, mở rộng sau khi có type mới.
