---
phase: 5
title: "Serialize sourceType"
status: completed
priority: P1
effort: "30m"
dependencies: [1]
---

# Phase 5: Serialize sourceType

## Overview

Thêm `sourceType: 'rss' | 'youtube'` vào `ApiArticle` interface và `serializeArticle` function để frontend biết article nào là video YouTube.

## Requirements

- `ApiArticle.sourceType` = `'youtube'` cho YouTube articles, `'rss'` cho tất cả còn lại
- `serializeArticle` nhận `src?: Source` (đã có) → đọc `src.type`
- Sau Phase 1, `Source` type đã có field `type: string` — dùng trực tiếp

## Related Code Files

- Modify: `app/src/lib/serialize.ts`

## Implementation Steps

1. Thêm `sourceType` vào `ApiArticle` interface:
```ts
export interface ApiArticle {
  // ... existing fields ...
  sourceType: 'rss' | 'youtube';
}
```

2. Trong `serializeArticle`, thêm `sourceType` vào return object:
```ts
export function serializeArticle(a: Article, src?: Source): ApiArticle {
  const lead = a.aiLead || "";
  return {
    // ... existing fields ...
    sourceType: (src?.type === 'youtube' ? 'youtube' : 'rss'),
  };
}
```

3. Verify TypeScript compile: `cd app && npx tsc --noEmit`

## Success Criteria

- [ ] `ApiArticle` có field `sourceType: 'rss' | 'youtube'`
- [ ] GET `/api/articles` trả `sourceType` cho mỗi article
- [ ] YouTube articles có `sourceType: 'youtube'`, VnExpress có `sourceType: 'rss'`
- [ ] TypeScript compile không lỗi

## Risk Assessment

Low — thêm 1 field vào interface và return object.
