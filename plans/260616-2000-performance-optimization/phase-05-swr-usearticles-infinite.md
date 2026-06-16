---
phase: 5
title: "SWR: useArticles (Infinite)"
status: done
priority: P2
effort: "4h"
dependencies: [4]
---

# Phase 5: SWR: useArticles (Infinite)

## Overview

Replace the manual pagination loop in `useArticles` with `useSWRInfinite`. Key benefits: stale-while-revalidate (filter switch shows cached result instantly), automatic page key management, and built-in abort/dedup handling.

## Requirements

- Functional: `items`, `total`, `hasMore`, `loadMore`, `reload` all work identically from consumer perspective
- Functional: `reload` must be wired to a **visible Refresh button** in `feed-view.tsx` and `hub-view.tsx` — page 0 does not auto-update while browsing (confirmed in validation)
- Non-functional: No extra API calls on filter re-mount; stale content shown immediately while fresh data loads in background

<!-- Updated: Validation Session 1 - revalidateFirstPage: false confirmed; reload must be exposed via Refresh button in consumers -->

## Architecture

### useSWRInfinite key function

`useSWRInfinite` takes a `getKey(pageIndex, previousPageData)` function. It returns `null` to stop pagination. For `useArticles`, the key encodes all filter params + page offset:

```typescript
const getKey = (pageIndex: number, prev: PageData | null) => {
  if (filter.enabled === false) return null;          // disabled — don't fetch
  if (prev && prev.items.length === 0) return null;   // no more pages
  const p = buildParams(filter, pageIndex * PAGE_SIZE);
  return `/api/articles?${p}`;                        // key = URL (also the fetch URL)
};
```

When any filter param changes, `useSWRInfinite` automatically resets to page 0 because all keys change.

### Page data structure

```typescript
interface PageData { total: number; items: ApiArticle[]; }
```

`useSWRInfinite` returns `data: PageData[] | undefined` — array of pages. Flatten to get `items`:
```typescript
const items = data?.flatMap((p) => p.items) ?? [];
const total = data?.[0]?.total ?? 0;
```

### loadMore

```typescript
const loadMore = useCallback(() => setSize((s) => s + 1), [setSize]);
```

`setSize` increments page count, triggering fetch of the next page key.

### Abort handling

`useSWRInfinite` handles concurrent request cancellation internally — no manual AbortController needed. Remove `abortRef`.

### Cache key stability

The URL string (including all filter params + offset) is the SWR cache key. When the user returns to the same filter, SWR serves the cached pages immediately (stale), then re-validates in background.

## Related Code Files

- Modify: `app/src/hooks/use-articles.ts` (full rewrite using `useSWRInfinite`)

## Implementation Steps

### 1. Extract `buildParams` helper

At the top of `use-articles.ts`, extract the URL params logic into a reusable function:

```typescript
function buildParams(filter: ArticlesFilter, offset: number): string {
  const p = new URLSearchParams();
  if (filter.source) p.set("source", filter.source);
  if (filter.cat) p.set("cat", filter.cat);
  if (filter.q?.trim()) p.set("q", filter.q.trim());
  if (filter.sort) p.set("sort", filter.sort);
  p.set("limit", String(filter.limit ?? PAGE_SIZE));
  p.set("offset", String(offset));
  return p.toString();
}
```

### 2. Rewrite `useArticles` with `useSWRInfinite`

```typescript
"use client";
import { useCallback } from "react";
import useSWRInfinite from "swr/infinite";
import { fetcher } from "@/lib/swr-fetcher";
import type { ApiArticle } from "@/lib/serialize";

export interface ArticlesFilter {
  source?: string | null;
  cat?: string | null;
  q?: string;
  sort?: "latest" | "hot" | "rank";
  limit?: number;
  enabled?: boolean;
}

interface PageData { total: number; items: ApiArticle[]; }

const PAGE_SIZE = 30;

function buildParams(filter: ArticlesFilter, offset: number): string {
  const p = new URLSearchParams();
  if (filter.source) p.set("source", filter.source);
  if (filter.cat) p.set("cat", filter.cat);
  if (filter.q?.trim()) p.set("q", filter.q.trim());
  if (filter.sort) p.set("sort", filter.sort);
  p.set("limit", String(filter.limit ?? PAGE_SIZE));
  p.set("offset", String(offset));
  return p.toString();
}

export function useArticles(filter: ArticlesFilter = {}) {
  const getKey = useCallback(
    (pageIndex: number, prev: PageData | null) => {
      if (filter.enabled === false) return null;
      if (prev && prev.items.length === 0) return null;
      return `/api/articles?${buildParams(filter, pageIndex * (filter.limit ?? PAGE_SIZE))}`;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter.source, filter.cat, filter.q, filter.sort, filter.limit, filter.enabled]
  );

  const { data, error, isLoading, isValidating, setSize, mutate } =
    useSWRInfinite<PageData>(getKey, fetcher, {
      revalidateOnFocus: false,
      revalidateFirstPage: false,  // don't re-fetch page 0 when loading more pages
      parallel: false,             // fetch pages sequentially (avoids offset race)
    });

  const items = data?.flatMap((p) => p.items) ?? [];
  const total = data?.[0]?.total ?? 0;
  const hasMore = items.length < total;

  const loadMore = useCallback(() => setSize((s) => s + 1), [setSize]);
  const reload = useCallback(() => {
    setSize(1);   // reset to 1 page
    mutate();     // revalidate
  }, [setSize, mutate]);

  return {
    items,
    total,
    loading: isLoading || isValidating,
    error: error ? String(error) : null,
    hasMore,
    loadMore,
    reload,
  };
}
```

### 3. Compile check

```bash
cd app && npx tsc --noEmit
```

### 4. Verify consumers compile

`useArticles` is used in `feed-view.tsx` and `hub-view.tsx` (check with grep). The public API surface is identical — no consumer changes needed.

```bash
grep -r "useArticles" app/src --include="*.tsx" --include="*.ts" -l
```

### 5. Wire `reload` to Refresh button in consumers

In `feed-view.tsx`: the existing `handleRefresh` callback calls `reloadSources()` — also call `reload` from `useArticles`. Confirm the Refresh button (RefreshCw icon, already present in the header) calls this handler.

In `hub-view.tsx`: `reloadArticles` is already wired to the refresh button at line ~173. Verify it still works after the SWR migration.

### 6. Manual smoke test

- Open app, switch source/category chips — feed updates
- Scroll to bottom — `loadMore` appends next page
- Switch back to a previous filter — cached results appear instantly (no loading spinner on return)
- No duplicate `/api/articles` requests in DevTools Network on tab re-focus
- Refresh button triggers a page 0 reload and shows new articles

## Success Criteria

- [ ] `use-articles.ts` imports `useSWRInfinite` (grep check)
- [ ] `useArticles` returns `{ items, total, loading, error, hasMore, loadMore, reload }` (same shape)
- [ ] `ArticlesFilter` interface still exported
- [ ] `cd app && npx tsc --noEmit` exits 0
- [ ] Switching filters resets to page 0 (no stale pages from previous filter)
- [ ] `loadMore` appends new page correctly
- [ ] No AbortController in the new implementation (SWR handles dedup internally)

## Risk Assessment

- `useSWRInfinite` key change → automatic page reset: when filter changes, `getKey` returns new URLs → SWR treats it as a new resource → resets `size` to 1. This matches the current `useEffect` behavior that resets `offset` to 0.
- `revalidateFirstPage: false`: prevents SWR from re-fetching page 0 every time `loadMore` is called (appending). Without this, each `loadMore` would also re-validate page 0 — incorrect behavior.
- `parallel: false`: fetches pages sequentially to avoid offset collisions. Small perf trade-off for correctness.
- `filter.enabled === false`: preserves existing behavior where `HubView` disables the hook when in digest mode.
- `reload` resets `size` to 1 before mutating — ensures full refresh from page 0, not just revalidation of existing pages.
