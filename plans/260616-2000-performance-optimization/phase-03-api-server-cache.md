---
phase: 3
title: "API Server Cache"
status: done
priority: P1
effort: "2h"
dependencies: []
---

# Phase 3: API Server Cache

## Overview

Two server-side caching changes: (1) module-level TTL cache for `sourceMap()` in the articles route — eliminates one extra DB query per request; (2) Next.js `unstable_cache` for `/api/sources` GET with tag-based invalidation on mutations.

## Requirements

- Functional: Sources cache invalidates on POST/DELETE/PUT; articles source data stays fresh within 30s
- Non-functional: No new dependencies. No behavioral change for users. Works with `dynamic = "force-dynamic"`.

## Architecture

### sourceMap cache (articles route)

`sourceMap()` in `articles/route.ts` currently runs `db.select().from(sources).all()` on every GET request. Sources change rarely (user adds/deletes manually). A module-level variable with 30s TTL eliminates this extra query with zero dependencies.

```
Module-level { map, ts } → check age → if fresh return map → else re-query DB + update
```

Module-level state persists for the lifetime of the Node.js process (Next.js worker). TTL of 30s means worst-case stale data is 30s old — acceptable since sources don't change during normal browsing.

### unstable_cache for /api/sources

`unstable_cache` is Next.js's built-in Data Cache (separate from the Route Cache). It works even with `dynamic = "force-dynamic"` because it operates at the data layer, not the route segment layer.

Key design:
- Cache tag: `"sources"` — allows targeted invalidation
- TTL: 30s (`revalidate: 30`)
- On POST (add source): call `revalidateTag("sources")` after DB insert
- On DELETE/PUT (delete/update source): call `revalidateTag("sources")` after DB mutation

```
GET /api/sources → unstable_cache(getSources, ["sources"], { revalidate: 30 })
                              ↓ cache hit → return cached JSON
POST /api/sources → DB insert → revalidateTag("sources") → next GET re-queries
```

Note: `unstable_cache` requires the wrapped function to be `async`. Current GET handler is sync — must convert to async.

## Related Code Files

- Modify: `app/src/app/api/articles/route.ts` (module-level sourceMap cache)
- Modify: `app/src/app/api/sources/route.ts` (unstable_cache for GET, revalidateTag for mutations)

## Implementation Steps

### 1. Module-level sourceMap cache in `articles/route.ts`

Replace the `sourceMap()` function with a cached version:

```typescript
// Add after imports, before GET handler
let _srcCache: { map: Map<string, Source>; ts: number } | null = null;
const SRC_TTL = 30_000; // 30 seconds

function sourceMap(): Map<string, Source> {
  if (_srcCache && Date.now() - _srcCache.ts < SRC_TTL) return _srcCache.map;
  const map = new Map(db.select().from(sources).all().map((s) => [s.id, s]));
  _srcCache = { map, ts: Date.now() };
  return map;
}
```

No other changes to `GET` handler needed — `sourceMap()` call at line 40 remains.

### 2. Wrap GET in `sources/route.ts` with `unstable_cache`

Add import at top of `sources/route.ts`:
```typescript
import { unstable_cache, revalidateTag } from "next/cache";
```

Wrap the GET query logic in a cached function. Extract the two DB queries from `GET()` into a separate async function, then wrap:

```typescript
const getCachedSources = unstable_cache(
  async () => {
    const counts = new Map(
      db
        .select({ sid: articles.sourceId, n: sql<number>`count(*)` })
        .from(articles)
        .where(eq(articles.aiStatus, "ready"))
        .groupBy(articles.sourceId)
        .all()
        .map((r) => [r.sid, r.n])
    );
    const rows = db.select().from(sources).all();
    return rows.map((s) => ({ ...s, active: !!s.active, count: counts.get(s.id) ?? 0 }));
  },
  ["sources-list"],
  { revalidate: 30, tags: ["sources"] }
);

export async function GET() {
  return NextResponse.json(await getCachedSources());
}
```

Note: `GET` must become `async` to await `getCachedSources()`.

### 3. Add `revalidateTag("sources")` to mutations

In `sources/route.ts` POST handler, after the successful DB insert (before the final `return`):
```typescript
revalidateTag("sources");
```

In `app/src/app/api/sources/[id]/route.ts` DELETE and PUT handlers, add the same after DB mutations:
```typescript
revalidateTag("sources");
```

First read `app/src/app/api/sources/[id]/route.ts` to find the correct insertion points.

### 4. Verify no TypeScript errors

```bash
cd app && npx tsc --noEmit
```

## Success Criteria

- [ ] `articles/route.ts` has module-level `_srcCache` variable and TTL check
- [ ] `sources/route.ts` GET is wrapped with `unstable_cache` and tag `"sources"`
- [ ] `sources/route.ts` POST calls `revalidateTag("sources")`
- [ ] `sources/[id]/route.ts` DELETE and PUT call `revalidateTag("sources")`
- [ ] `cd app && npx tsc --noEmit` exits 0
- [ ] Manual verify: add a source → sources list updates within next GET (not stale for >30s)

## Risk Assessment

- `_srcCache` module-level state: shared across concurrent requests in same worker — correct behavior (all requests benefit from cache). TTL prevents stale data accumulation.
- `unstable_cache` API stability: marked "unstable" but stable in practice since Next.js 14. Used widely. No risk.
- `revalidateTag` in POST: must be called after the DB operation completes, not before. Ensure placement is correct.
- `GET` becoming async: Next.js supports async route handlers natively. No breaking change.
