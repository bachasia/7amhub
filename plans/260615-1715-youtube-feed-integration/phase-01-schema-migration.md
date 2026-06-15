---
phase: 1
title: "Schema Migration"
status: completed
priority: P1
effort: "30m"
dependencies: []
---

# Phase 1: Schema Migration

## Overview

Thêm cột `type` vào bảng `sources` để phân biệt RSS feed thông thường với YouTube channel. All existing sources default `'rss'`.

## Requirements

- `sources.type` nhận giá trị `'rss'` hoặc `'youtube'`, default `'rss'`
- Backward-compatible — existing sources không bị ảnh hưởng

## Related Code Files

- Modify: `app/src/lib/db/schema.ts`
- Create: migration file (auto-generated bởi drizzle-kit)

## Implementation Steps

1. Sửa `app/src/lib/db/schema.ts` — thêm `type` vào `sources` table sau cột `active`:

```ts
type: text("type").notNull().default("rss"),
```

2. Generate migration:
```bash
cd app && npx drizzle-kit generate
```

3. Apply migration:
```bash
cd app && npx drizzle-kit migrate
```

4. Verify:
```bash
cd app && node -e "const Database = require('better-sqlite3'); const db = new Database('data/feed.db'); console.log(db.pragma('table_info(sources)'));"
```
   → Phải thấy column `type` với default `'rss'`.

## Success Criteria

- [ ] `sources` table có cột `type TEXT NOT NULL DEFAULT 'rss'`
- [ ] Migration apply thành công không lỗi
- [ ] `Source` TypeScript type bao gồm `type: string`
- [ ] Existing sources trong DB có `type = 'rss'`
- [ ] `tsc --noEmit` không báo lỗi

## Risk Assessment

Low risk — thêm column với default value, không break existing queries.
