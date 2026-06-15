---
phase: 1
title: "Schema group column"
status: completed
priority: P1
effort: "30m"
dependencies: []
---

# Phase 1: Schema group column

## Overview

Thêm cột `group` (nullable text) vào bảng `sources` để lưu folder do user gán. Backfill nguồn VnExpress hiện có thành `group = "VnExpress"`.

## Requirements

- `sources.group` = `text("group")` nullable (không default cứng — null = chưa phân loại).
- Backward-compatible: nguồn cũ không lỗi.
- Migration backfill: các source có label dạng `X · Y` → `group = X` (giữ nhóm hiện tại).

## Related Code Files

- Modify: `app/src/lib/db/schema.ts`
- Create: migration trong `app/drizzle/`

## Implementation Steps

1. Trong `schema.ts`, thêm vào `sources` table sau `type`:
```ts
group: text("group"),
```
   **Lưu ý:** `group` là từ khóa SQL → Drizzle quote tự động bằng backtick trong DDL; vẫn dùng được. Tên cột DB là `group`.

2. Generate migration:
```bash
cd app && npx drizzle-kit generate
```
   **Kiểm tra migration SQL được sinh ra** chỉ chứa `ALTER TABLE sources ADD group text;` — nếu drizzle bundle thêm DDL lạ (do snapshot drift như lần trước), sửa file SQL chỉ giữ dòng ADD column.

3. Thêm bước backfill vào CUỐI file migration SQL vừa sinh (cùng migration, sau ADD column):
```sql
--> statement-breakpoint
UPDATE `sources` SET `group` = substr(`label`, 1, instr(`label`, ' · ') - 1) WHERE instr(`label`, ' · ') > 0;
```

4. Apply: `cd app && npm run db:migrate`

5. Verify:
```bash
cd app && node -e "const D=require('better-sqlite3');const db=new D(process.env.DB_PATH||'./data/7amhub.db');console.log(db.prepare('SELECT id,label,\`group\` FROM sources').all());"
```
   → Nguồn `VnExpress · Thế giới` phải có `group = "VnExpress"`.

## Success Criteria

- [ ] `sources` có cột `group` (nullable)
- [ ] `Source` type có `group: string | null`
- [ ] Nguồn VnExpress hiện có được backfill `group`
- [ ] Migration apply không lỗi; fresh DB migrate sạch
- [ ] `tsc --noEmit` pass

## Risk Assessment

Low. Lưu ý duy nhất: `group` là reserved word — luôn quote khi viết SQL thủ công. Drizzle ORM query (`sources.group`) an toàn.
