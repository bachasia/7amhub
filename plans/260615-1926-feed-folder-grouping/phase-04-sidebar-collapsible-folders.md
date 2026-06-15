---
phase: 4
title: "Sidebar collapsible folders"
status: completed
priority: P1
effort: "2.5h"
dependencies: [2]
---

# Phase 4: Sidebar collapsible folders

## Overview

Đổi `SourceSidebar` từ nhóm auto base-label sang nhóm theo `src.group`. Folder có chevron đóng/mở, **mặc định đóng**, lưu trạng thái mở vào `localStorage`. Nguồn không có `group` hiển thị phẳng (không header).

## Requirements

- Group theo `src.group`; `group=null` → render phẳng phía trên các folder.
- Mỗi folder: header có chevron (▸/▾) + tên + tổng count bài; click toggle.
- Mặc định **đóng hết**. Trạng thái mở lưu `localStorage` key `7am.openGroups` (mảng tên folder đang mở).
- Click feed vẫn `onSelect(id)` như cũ; nút refresh hover giữ nguyên.
- Giữ `getSubLabel` (hiển thị "Thế giới" khi nhiều nguồn cùng folder).

## Architecture

```
groupByFolder(sources):
  flat: ApiSource[]            // group == null
  folders: Map<string, ApiSource[]>  // group != null, giữ thứ tự xuất hiện

openGroups: Set<string>  ← localStorage, default rỗng (đóng hết)
toggleGroup(name): cập nhật set + ghi localStorage
```

## Related Code Files

- Modify: `app/src/components/hub/source-sidebar.tsx`

## Implementation Steps

1. Thay `groupSources` bằng hàm tách flat + folders theo `group`:
```ts
function splitByFolder(sources: ApiSource[]) {
  const flat: ApiSource[] = [];
  const folders = new Map<string, ApiSource[]>();
  for (const s of sources) {
    if (!s.group) { flat.push(s); continue; }
    if (!folders.has(s.group)) folders.set(s.group, []);
    folders.get(s.group)!.push(s);
  }
  return { flat, folders };
}
```

2. State openGroups + persist:
```ts
const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
useEffect(() => {
  try {
    const raw = localStorage.getItem("7am.openGroups");
    if (raw) setOpenGroups(new Set(JSON.parse(raw)));
  } catch { /* ignore */ }
}, []);
const toggleGroup = (name: string) => {
  setOpenGroups((prev) => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    try { localStorage.setItem("7am.openGroups", JSON.stringify([...next])); } catch { /* ignore */ }
    return next;
  });
};
```
   **Lưu ý SSR/hydration:** đọc localStorage trong `useEffect` (không trong init) → tránh mismatch; default đóng khớp server render.

3. Tách phần render 1 feed-row hiện tại (button + refresh-btn) thành 1 helper `renderRow(src, items)` trong component để dùng lại cho flat + folder (DRY) — giữ nguyên markup/style hiện có.

4. Render:
   - "Tất cả nguồn" (giữ nguyên).
   - `flat.map(renderRow)` — nguồn chưa phân loại, không header.
   - Với mỗi `[name, items]` của folders:
```tsx
<div key={name} style={{ marginTop: 6 }}>
  <button
    onClick={() => toggleGroup(name)}
    style={{ ...groupHeaderStyle }}
    aria-expanded={openGroups.has(name)}
  >
    <ChevronRight size={13} style={{ transform: openGroups.has(name) ? "rotate(90deg)" : "none", transition: ".15s", flexShrink: 0 }} />
    <span style={{ flex: 1, textAlign: "left" }}>{name}</span>
    <span style={countStyle(false)}>{items.reduce((n, s) => n + (s.count ?? 0), 0)}</span>
  </button>
  {openGroups.has(name) && items.map((src) => renderRow(src, items))}
</div>
```
   `groupHeaderStyle` = biến thể của `groupLabelStyle` nhưng là button full-width, display flex, gap 6, cursor pointer, items center.

5. Import `ChevronRight` từ `lucide-react` (đã dùng ở hub-view, có sẵn trong package).

## Success Criteria

- [ ] Feed nhóm đúng theo `group`; nguồn null hiển thị phẳng
- [ ] Folder mặc định đóng; click chevron mở/đóng; icon xoay
- [ ] Reload trang giữ đúng folder đang mở (localStorage)
- [ ] Count trên header = tổng bài các feed trong folder
- [ ] Click feed vẫn lọc đúng; nút refresh hover còn hoạt động
- [ ] Mobile sidebar (drawer) vẫn render đúng
- [ ] `tsc --noEmit` + build pass

## Risk Assessment

Medium — refactor render. Rủi ro hydration mismatch nếu đọc localStorage lúc init → bắt buộc đọc trong `useEffect`. Giữ markup row cũ để không vỡ style/hover.
