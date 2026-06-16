---
phase: 2
title: "React Memoization"
status: done
priority: P1
effort: "1h"
dependencies: []
---

# Phase 2: React Memoization

## Overview

Stop unnecessary re-renders on filter/tab/source changes. Three targeted changes: `React.memo` on list item components, `useMemo` for `srcMap` in FeedView, and extract static inline style objects to module-level constants in ArticleCard.

## Requirements

- Functional: Zero behavioral change — same UI, same interactions
- Non-functional: Reduce reconciler work 40–60% when parent state changes (chip, drawerOpen, hasScrolled, theme toggle)

## Architecture

**Why re-renders happen now:**
- `FeedView` has many state variables (`chip`, `drawerOpen`, `hasScrolled`, `activeIdx`, `refreshing`). Any change triggers a full re-render of all children.
- `ArticleCard` and `ArticleRow` have no bail-out guard → re-render even when their props are identical.
- `srcMap = new Map(sources.map(...))` at `feed-view.tsx:68` creates a new object reference every render, defeating any downstream memoization keyed on it.
- Inline style objects in `ArticleCard` (e.g. `style={{ height: "100%", display: "flex", ... }}`) allocate new objects per render → React sees changed props.

**Fix:**
- `React.memo` wraps components with shallow prop comparison — bails out when props unchanged.
- `useMemo` for `srcMap` memoizes the Map until `sources` array reference changes.
- Module-level style constants have stable references forever.

**Callback stability check (prerequisite for React.memo to work):** FeedView already wraps `onOpen`, `onSave` callbacks in `useCallback` before passing to children — confirmed in codebase. `React.memo` will work correctly.

## Related Code Files

- Modify: `app/src/components/feed/article-card.tsx`
- Modify: `app/src/components/hub/article-row.tsx`
- Modify: `app/src/components/feed/feed-view.tsx`

## Implementation Steps

### 1. Wrap `ArticleCard` with `React.memo`

In `app/src/components/feed/article-card.tsx`:

```typescript
// Add React import if not present (check first line)
import React from "react";

// Change export declaration
export const ArticleCard = React.memo(function ArticleCard({
  article, saved, onOpen, onSave, onRead,
}: ArticleCardProps) {
  // ... body unchanged
});
```

### 2. Extract static inline style objects in `ArticleCard`

Read the full file first to identify purely static style objects (no variables, no conditionals).
Add module-level constants above the component for each static style block. Example:

```typescript
const CARD_OUTER: React.CSSProperties = {
  height: "100%",
  scrollSnapAlign: "start",
  scrollSnapStop: "always",
  display: "flex",
  flexDirection: "column",
  padding: 12,
  flexShrink: 0,
};
```

Then replace `style={{ height: "100%", scrollSnapAlign: "start", ... }}` with `style={CARD_OUTER}`.

Only extract styles with no runtime-computed values. Styles that reference `bg`, `pill`, or conditionals stay inline.

### 3. Wrap `ArticleRow` with `React.memo`

In `app/src/components/hub/article-row.tsx`:

```typescript
import React from "react";

export const ArticleRow = React.memo(function ArticleRow({
  article, source, read, saved, onOpen, onSave,
}: ArticleRowProps) {
  // ... body unchanged
});
```

### 4. Memoize `srcMap` in `FeedView`

In `app/src/components/feed/feed-view.tsx`, find line ~68:

```typescript
// Before
const srcMap = new Map(sources.map((s) => [s.id, s]));

// After — add useMemo to existing react import
const srcMap = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
```

`useMemo` is already imported (or add to the existing `import { useState, useRef, ... } from "react"` line).

### 5. Compile check

```bash
cd app && npx tsc --noEmit
```

## Success Criteria

- [ ] `grep "React.memo" app/src/components/feed/article-card.tsx` returns a match
- [ ] `grep "React.memo" app/src/components/hub/article-row.tsx` returns a match
- [ ] `grep "useMemo" app/src/components/feed/feed-view.tsx` returns a match for srcMap
- [ ] At least 2 module-level `CSSProperties` constants in `article-card.tsx`
- [ ] `cd app && npx tsc --noEmit` exits 0

## Risk Assessment

- `React.memo` requires stable callback refs — already guaranteed by `useCallback` in FeedView. Safe.
- Inline style extraction: only static objects. Dynamic styles stay inline. No visual regression risk.
- `useMemo` deps `[sources]`: SWR (Phase 4) will provide stable array refs when data is unchanged, making this even more effective after Phase 4.
