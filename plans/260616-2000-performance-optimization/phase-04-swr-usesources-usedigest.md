---
phase: 4
title: "SWR: useSources + useDigest"
status: done
priority: P2
effort: "3h"
dependencies: [3]
---

# Phase 4: SWR: useSources + useDigest

## Overview

Replace manual `useState`/`useEffect` fetch loops in `useSources` and `useDigest` with SWR. Key benefit: multiple consumers of `useSources()` across the app (FeedView, HubView, FeedManager) share **one** in-flight request and one cached result — no duplicate API calls.

## Requirements

- Functional: All mutations (addSource, deleteSource, updateSource) still work; optimistic updates preserved; `reload` still triggers a fresh fetch
- Non-functional: Install `swr` package; multiple hook consumers → single deduplicated request; stale-while-revalidate on focus

## Architecture

### Why SWR for these two hooks

`useSources` is consumed in multiple components simultaneously. Currently each mount triggers an independent `fetch("/api/sources")`. SWR deduplicates by key: all instances with key `"/api/sources"` share one request within `dedupingInterval`.

`useDigest` fetches once on mount and never revalidates — maps directly to `useSWR` with `revalidateOnFocus: false`.

### SWR config for useSources

```typescript
useSWR<ApiSource[]>("/api/sources", fetcher, {
  dedupingInterval: 30_000,      // dedup requests within 30s window
  revalidateOnFocus: true,       // refresh when tab regains focus — matches current behavior
  revalidateOnReconnect: true,   // refresh after network drop
})
```

<!-- Updated: Validation Session 1 - revalidateOnFocus changed to true; matches existing behavior where every mount re-fetches -->

### Mutations pattern

SWR's `mutate` function updates the cache and optionally triggers revalidation:

```typescript
// Optimistic add
mutate("/api/sources",
  (current) => [...(current ?? []), newSource],
  { revalidate: false }   // don't re-fetch; server cache invalidated via revalidateTag
);

// After error: revert by revalidating
mutate("/api/sources");
```

### Return interface compatibility

Keep the same public interface (`{ sources, loading, error, reload, addSource, deleteSource, updateSource }`) so all consumers require zero changes.

## Related Code Files

- Modify: `app/src/hooks/use-sources.ts` (full rewrite)
- Modify: `app/src/hooks/use-digest.ts` (full rewrite)
- Create: `app/src/lib/swr-fetcher.ts` (shared fetcher utility)

## Implementation Steps

### 1. Install SWR

```bash
cd app && npm install swr
```

Verify `swr` appears in `package.json` dependencies.

### 2. Create shared fetcher

Create `app/src/lib/swr-fetcher.ts`:

```typescript
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
```

### 3. Rewrite `use-sources.ts`

```typescript
"use client";
import { useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/swr-fetcher";

export interface ApiSource {
  id: string;
  label: string;
  sublabel: string | null;
  url: string;
  siteUrl: string | null;
  active: boolean;
  type: string;
  group: string | null;
  count: number;
}

const KEY = "/api/sources";

export function useSources() {
  const { data, error, isLoading, mutate } = useSWR<ApiSource[]>(KEY, fetcher, {
    dedupingInterval: 30_000,
    revalidateOnFocus: true,       // matches current behavior — refresh on tab focus
    revalidateOnReconnect: true,
  });

  const reload = useCallback(() => mutate(), [mutate]);

  const addSource = useCallback(async (
    label: string, url: string, group?: string | null, trending?: boolean
  ): Promise<ApiSource> => {
    const res = await fetch(KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url, group, trending }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Lỗi thêm nguồn.");
    // Optimistic: append to cache; server-side revalidateTag handles next GET
    await mutate((current) => [...(current ?? []), data], { revalidate: false });
    return data;
  }, [mutate]);

  const deleteSource = useCallback(async (id: string) => {
    const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Lỗi xóa nguồn.");
    await mutate((current) => (current ?? []).filter((s) => s.id !== id), { revalidate: false });
  }, [mutate]);

  const updateSource = useCallback(async (
    id: string, label: string, url: string, group?: string | null
  ): Promise<ApiSource> => {
    const res = await fetch(`/api/sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url, group }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Lỗi cập nhật nguồn.");
    // Preserve active + count from local state (PUT returns raw row without these)
    await mutate(
      (current) => (current ?? []).map((s) =>
        s.id === id ? { ...s, ...data, active: s.active, count: s.count } : s
      ),
      { revalidate: false }
    );
    return { ...data, active: !!data.active };
  }, [mutate]);

  return {
    sources: data ?? [],
    loading: isLoading,
    error: error ? String(error) : null,
    reload,
    addSource,
    deleteSource,
    updateSource,
  };
}
```

### 4. Rewrite `use-digest.ts`

```typescript
"use client";
import { useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";

// Keep DigestGroup, DigestCluster, DigestData interface DEFINITIONS here (not imports).
// digest-view.tsx imports these types from "@/hooks/use-digest" — they must stay exported.

// (keep DigestGroup, DigestCluster, DigestData interface exports unchanged)

const KEY = "/api/digest/today";

export function useDigest() {
  const { data, error, isLoading, mutate } = useSWR<DigestData>(KEY, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false, // digest only changes once per day
    dedupingInterval: 60_000,
  });

  const reload = useCallback(() => mutate(), [mutate]);

  return {
    data: data ?? null,
    loading: isLoading,
    error: error ? String(error) : null,
    reload,
  };
}
```

Keep `DigestGroup`, `DigestCluster`, `DigestData` interface exports at the top of the file — consumers import these types.

### 5. Compile + verify

```bash
cd app && npx tsc --noEmit
```

## Success Criteria

- [ ] `swr` in `app/package.json` dependencies
- [ ] `app/src/lib/swr-fetcher.ts` exists
- [ ] `use-sources.ts` uses `useSWR` (grep check)
- [ ] `use-digest.ts` uses `useSWR` (grep check)
- [ ] `DigestGroup`, `DigestCluster`, `DigestData` types still exported from `use-digest.ts`
- [ ] `useSources()` public API unchanged: `{ sources, loading, error, reload, addSource, deleteSource, updateSource }`
- [ ] `cd app && npx tsc --noEmit` exits 0
- [ ] Manual verify: open DevTools Network tab, mount FeedView — `/api/sources` called once even though multiple components use `useSources()`

## Risk Assessment

- Return interface preserved exactly — zero consumer changes needed.
- SWR `mutate` with `revalidate: false` for mutations: server-side `revalidateTag("sources")` (Phase 3) handles cache invalidation on next GET. Both layers work independently — if Phase 3 is not yet applied, SWR will optimistically update client state; full consistency on next `revalidateOnFocus` or explicit reload.
- `dedupingInterval: 30_000` means if sources change server-side within 30s of last fetch, client may see stale data. Acceptable — sources are manually managed by user.
- `useDigest` `revalidateOnReconnect: false`: digest is regenerated at 07:00 daily; page reload triggers re-fetch if needed.
