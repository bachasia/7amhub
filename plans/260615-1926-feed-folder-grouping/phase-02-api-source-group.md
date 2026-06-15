---
phase: 2
title: "API + hook group plumbing"
status: completed
priority: P1
effort: "1h"
dependencies: [1]
---

# Phase 2: API + hook group plumbing

## Overview

Cho phép gửi/nhận `group` qua API sources và hook `use-sources`. GET đã trả `group` tự động (spread `...s`); chỉ cần POST/PUT chấp nhận và lưu, hook truyền field.

## Related Code Files

- Modify: `app/src/app/api/sources/route.ts` (POST)
- Modify: `app/src/app/api/sources/[id]/route.ts` (PUT)
- Modify: `app/src/hooks/use-sources.ts`

## Implementation Steps

### A. POST `route.ts`

1. `bodySchema` thêm `group` optional:
```ts
const bodySchema = z.object({
  label: z.string().trim().min(1),
  url: z.string().trim().min(1),
  group: z.string().trim().nullish(),
});
```

2. Trong object `row` khi insert, thêm:
```ts
group: parsed.data.group?.trim() || null,
```
   (đặt cạnh `type: sourceType`).

### B. PUT `[id]/route.ts`

3. `bodySchema` thêm `group: z.string().trim().nullish()`.

4. Trong `next`, thêm xử lý group (cho phép set rỗng = bỏ folder):
```ts
const next = {
  label: parsed.data.label ?? s.label,
  url: parsed.data.url ? normalizeUrl(parsed.data.url) : s.url,
  group: parsed.data.group !== undefined ? (parsed.data.group?.trim() || null) : s.group,
};
```

### C. `use-sources.ts`

5. `ApiSource` thêm:
```ts
group: string | null;
```

6. `addSource` đổi signature nhận group:
```ts
const addSource = useCallback(async (label: string, url: string, group?: string | null): Promise<ApiSource> => {
  const res = await fetch("/api/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, url, group }),
  });
  // ... unchanged
}, []);
```

7. `updateSource` tương tự nhận `group?: string | null` và đưa vào body.

## Success Criteria

- [ ] POST với `{label,url,group:"AI"}` → source lưu `group="AI"`
- [ ] POST không có group → `group=null`
- [ ] PUT đổi `group` → cập nhật; PUT `group:""` → `null`
- [ ] GET trả `group` mỗi source
- [ ] `tsc --noEmit` pass; callers cũ `addSource(label,url)` vẫn hợp lệ (group optional)

## Risk Assessment

Low. `group` optional nên không phá caller hiện tại.
