---
phase: 4
title: "AI Worker Skip Extract"
status: completed
priority: P1
effort: "30m"
dependencies: [1]
---

# Phase 4: AI Worker Skip Extract

## Overview

Bỏ qua bước `extractFullText` trong AI worker cho YouTube articles. Readability sẽ fail hoặc trả về garbage trên youtube.com — dùng `rawSummary` (description từ RSS) làm input cho classify thay thế.

## Requirements

- YouTube articles (`url` chứa `youtube.com/watch`) → skip `extractFullText`, dùng `rawSummary` trực tiếp
- Regular articles → flow không thay đổi
- hotScore cho YouTube tính trên `rawSummary.length` thay vì `fullText.length`

## Related Code Files

- Modify: `app/src/lib/jobs/ai-worker.ts`

## Implementation Steps

1. Trong `processOne`, thêm YouTube URL check **trước** khi gọi `extractFullText`:

```ts
async function processOne(a: typeof articles.$inferSelect): Promise<boolean> {
  const isYouTube = a.url.includes('youtube.com/watch');  // ADD THIS
  let fullText = a.fullText;

  if (!fullText && !isYouTube) {   // MODIFY: skip extract for YouTube
    const ex = await extractFullText(a.url);
    if (ex) {
      fullText = ex.text;
      db.update(articles)
        .set({
          fullText,
          content: JSON.stringify(ex.blocks),
          ...(!a.image && ex.image ? { image: ex.image } : {}),
        })
        .where(eq(articles.id, a.id))
        .run();
    }
  }

  const text = fullText || a.rawSummary || "";
  // ... rest unchanged
```

2. Không cần thay đổi gì thêm — `analyzeArticle({ title, text })` với `text = rawSummary` hoạt động tốt.

## Success Criteria

- [ ] Sau khi add YouTube source và chờ cron, YouTube articles có `ai_status = 'ready'` (không bị stuck ở pending)
- [ ] YouTube articles có `category`, `aiTitle`, `aiLead` được populate
- [ ] YouTube articles KHÔNG có `full_text` trong DB (extract bị skip)
- [ ] VnExpress articles vẫn có `full_text` như cũ

## Risk Assessment

Low — thay đổi 2 dòng, logic đơn giản.
