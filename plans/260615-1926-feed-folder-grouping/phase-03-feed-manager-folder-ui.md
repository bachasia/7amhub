---
phase: 3
title: "Feed manager folder UI"
status: completed
priority: P1
effort: "1.5h"
dependencies: [2]
---

# Phase 3: Feed manager folder UI

## Overview

Thêm field "Thư mục" (folder) vào form thêm + sửa trong `FeedManagerDialog`. Dùng `<input>` + `<datalist>` để vừa gõ folder mới vừa chọn folder sẵn có.

## Related Code Files

- Modify: `app/src/components/hub/feed-manager-dialog.tsx`
- Modify: `app/src/components/hub/hub-view.tsx` (truyền signature mới của onAdd/onUpdate — thực chất chỉ forward, ApiSource đã có group)

## Implementation Steps

1. Props `onAdd`/`onUpdate` đổi để nhận group:
```ts
onAdd: (label: string, url: string, group?: string | null) => Promise<unknown>;
onUpdate: (id: string, label: string, url: string, group?: string | null) => Promise<unknown>;
```
   (Trong `hub-view.tsx`, `addSource`/`updateSource` từ Phase 2 đã khớp signature → truyền thẳng, không cần wrapper.)

2. Thêm state cho folder:
```ts
const [group, setGroup] = useState("");        // add form
const [editGroup, setEditGroup] = useState(""); // edit form
```

3. Tính danh sách folder sẵn có để gợi ý (datalist):
```ts
const existingGroups = Array.from(
  new Set(sources.map((s) => s.group).filter((g): g is string => !!g))
).sort();
```

4. Render `<datalist id="folder-options">` 1 lần trong dialog:
```tsx
<datalist id="folder-options">
  {existingGroups.map((g) => <option key={g} value={g} />)}
</datalist>
```

5. **Add form**: thêm input folder (optional) sau input URL, trước nút submit:
```tsx
<input
  value={group}
  onChange={(e) => setGroup(e.target.value)}
  placeholder="Thư mục (tuỳ chọn, vd: AI)"
  list="folder-options"
  style={inputStyle}
  disabled={saving}
/>
```
   Trong `handleAdd`: gọi `await onAdd(label.trim(), url.trim(), group.trim() || null)`; reset `setGroup("")`.

6. **Edit form**: thêm input folder dùng `editGroup`. Trong `startEdit(src)` set `setEditGroup(src.group ?? "")`. Trong `handleUpdate`: `await onUpdate(id, editLabel.trim(), editUrl.trim(), editGroup.trim() || null)`.

7. **Hiển thị folder** trong list view (chế độ không edit): dưới URL hoặc cạnh label, thêm badge nhỏ nếu `src.group`:
```tsx
{src.group && (
  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", background: "var(--muted)", padding: "1px 7px", borderRadius: 6 }}>
    {src.group}
  </span>
)}
```

## Success Criteria

- [ ] Thêm nguồn mới + gõ folder "AI" → source có `group="AI"`, xuất hiện trong datalist lần sau
- [ ] Sửa nguồn → đổi folder lưu thành công; xoá folder (để trống) → `group=null`
- [ ] Datalist gợi ý các folder đã có
- [ ] List view hiển thị badge folder
- [ ] `tsc --noEmit` pass

## Risk Assessment

Low — thuần UI form. `<datalist>` hỗ trợ tốt mọi browser hiện đại.
