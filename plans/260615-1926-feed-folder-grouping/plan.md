---
title: "Feed Folder Grouping (Folo-style)"
description: "User-assigned collapsible feed folders in the sidebar, a feed-type filter row (RSS/YouTube), folder assignment in the manage dialog, and persisted collapse state."
status: completed
priority: P2
branch: "main"
tags: ["sidebar", "feeds", "folders", "ui"]
created: "2026-06-15T12:26:00Z"
createdBy: "ck:cook"
---

# Feed Folder Grouping (Folo-style)

Thêm khả năng nhóm feed vào folder do user tự gán (giống Folo). Sidebar render folder collapsible (mặc định đóng, lưu trạng thái), có hàng icon lọc loại feed (RSS/YouTube), và UI gán/đổi folder trong dialog quản lý nguồn.

## Quyết định thiết kế (đã chốt với user)

- Folder do **user tự gán** → thêm cột `group` vào `sources`.
- Mặc định **đóng hết** folder; lưu trạng thái mở/đóng vào `localStorage`.
- Phạm vi: (1) folder collapsible, (2) UI gán/đổi folder, (3) hàng icon lọc loại feed, (4) lưu trạng thái.

## Quyết định mặc định (Claude chọn — báo nếu muốn đổi)

- **Nguồn chưa gán folder** → hiển thị phẳng, không header (giống "Welcome to Folo" trong ảnh).
- **Backfill**: 5 nguồn VnExpress hiện có (`VnExpress · …`) được set `group = "VnExpress"` khi migrate, để giữ nguyên trải nghiệm nhóm hiện tại. Nguồn YouTube seed → `group = null` (phẳng).
- **Hàng icon lọc loại** lọc *nguồn hiển thị trong sidebar* (All / RSS / YouTube) kèm số đếm nguồn — không đụng tới feed bài viết ở cột giữa.

## Architecture Flow

```
sources.group (text, nullable)
        │
        ├─ POST/PUT /api/sources  ← body thêm field group (optional)
        │
        ├─ GET /api/sources       → trả group (đã spread ...s)
        │
        ├─ use-sources: ApiSource.group; addSource/updateSource nhận group
        │
        ├─ FeedManagerDialog: input folder (datalist các group sẵn có)
        │
        └─ SourceSidebar:
             ├─ feed-type filter row (All/RSS/YouTube + count)
             ├─ group theo src.group (null → phẳng)
             ├─ folder collapsible, default đóng
             └─ trạng thái mở lưu localStorage key "7am.openGroups"
```

## Phases

| Phase | Name | Status | Effort | Files |
|-------|------|--------|--------|-------|
| 1 | [Schema group column](./phase-01-schema-group-column.md) | Done | 30m | `schema.ts`, migration |
| 2 | [API + hook group plumbing](./phase-02-api-source-group.md) | Done | 1h | `api/sources/route.ts`, `api/sources/[id]/route.ts`, `use-sources.ts` |
| 3 | [Feed manager folder UI](./phase-03-feed-manager-folder-ui.md) | Done | 1.5h | `feed-manager-dialog.tsx`, `hub-view.tsx` |
| 4 | [Sidebar collapsible folders](./phase-04-sidebar-collapsible-folders.md) | Done | 2.5h | `source-sidebar.tsx` |
| 5 | [Feed-type filter row](./phase-05-feed-type-filter-row.md) | Done | 1h | `source-sidebar.tsx` |

**Total estimated effort:** ~6.5h

## Dependencies

- Phase 2 depends on 1; Phase 3 depends on 2; Phases 4–5 depend on 2 (group field in `ApiSource`).
- Phases 4 và 5 cùng sửa `source-sidebar.tsx` → làm tuần tự (4 trước, 5 sau).

## Out of scope (đợt này)

- Kéo-thả sắp xếp folder/feed.
- Folder lồng nhau (nested).
- Đổi tên folder hàng loạt (chỉ đổi qua việc sửa từng nguồn).
