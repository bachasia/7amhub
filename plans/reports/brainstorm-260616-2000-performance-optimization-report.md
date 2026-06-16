# Performance Optimization Brainstorm — 7am-feed

**Date:** 2026-06-16  
**Session:** End-to-end performance audit → Approach C (full stack) approved

---

## Problem Statement

Proactive performance optimization across the full stack. No critical pain points, but several measurable bottlenecks identified through code audit.

**Constraints:** Keep SQLite, no Redis/external cache, no infra changes — code-only.

---

## Bottlenecks Found

| Priority | Issue | Location | Impact |
|---|---|---|---|
| HIGH | `sourceMap()` re-fetches all sources on every GET /api/articles | `articles/route.ts:40` | +1 extra DB query per request |
| HIGH | No `React.memo` on `ArticleCard`, `ArticleRow` | `article-card.tsx`, `article-row.tsx` | Full re-render on parent state change |
| HIGH | `srcMap = new Map(...)` created on every `FeedView` render | `feed-view.tsx:68` | Map allocation per filter/tab change |
| MED | `useSources()` re-fetches on every mount, no dedup across consumers | `use-sources.ts` | Duplicate API calls |
| MED | Missing composite DB indexes | `schema.ts` | Slow trending + 24h dedup queries |
| MED | Inline style objects recreated per render in `ArticleCard` | `article-card.tsx:38-245` | Object allocation + GC churn |
| LOW | SQLite PRAGMA: missing synchronous=NORMAL, cache_size, mmap_size | `db/client.ts:17-18` | Sub-optimal WAL performance |
| LOW | 2 separate queries in normal source ingest (existingRows + recentRows) | `rss.ts:178-187` | Minor ingest overhead |

---

## Rejected Approaches

- **Redis/external cache**: violates constraint
- **PostgreSQL migration**: violates constraint
- **Infra changes (multi-process, CDN)**: violates constraint
- **Approach A only**: too conservative, misses client-side re-fetch waste
- **Approach B only**: leaves major SWR benefit (deduped stale-while-revalidate) on the table

---

## Agreed Solution: Approach C — Full Stack Optimization

### Layer 1: SQLite PRAGMA Tuning (5 min)
File: `app/src/lib/db/client.ts`
```typescript
sqlite.pragma("synchronous = NORMAL");    // fewer fsync — safe with WAL
sqlite.pragma("cache_size = -16000");     // 16MB page cache
sqlite.pragma("mmap_size = 30000000000"); // 30GB mmap via OS page cache
sqlite.pragma("temp_store = memory");     // temp tables in RAM
sqlite.pragma("busy_timeout = 5000");     // retry on lock contention
```

### Layer 2: React Memoization (30 min)
- `React.memo(ArticleCard)`, `React.memo(ArticleRow)` — stop re-renders on parent filter/tab change
- `useMemo(() => new Map(sources.map(...)), [sources])` for `srcMap` in `FeedView`
- Extract inline style objects in `ArticleCard` to module-level constants

### Layer 3: API-level In-memory Cache (1-2h)
- `articles/route.ts`: module-level `sourceMap` cache, 30s TTL — eliminates extra DB query per request
- `sources/route.ts`: `unstable_cache` (Next.js built-in), 30s TTL, tag `"sources"`
  - Invalidate tag on POST/DELETE with `revalidateTag("sources")`
- `digest/route.ts`: `unstable_cache`, 1h TTL, tag `"digest-today"`

### Layer 4: Missing DB Indexes (migration)
File: `app/src/lib/db/schema.ts`
```typescript
byFeedOrder: index("idx_articles_feed_order").on(t.feedOrder),
byStatusAndFeedOrder: index("idx_articles_status_feed").on(t.aiStatus, t.feedOrder),
bySourceAndFetched: index("idx_articles_source_fetched").on(t.sourceId, t.fetchedAt),
```
Run Drizzle migration to apply.

### Layer 5: SWR Client Cache (main effort, 2-3 days)
Install: `npm install swr` (~4KB gzipped, Vercel-native)

| Current hook | SWR replacement | Key benefit |
|---|---|---|
| `useSources()` | `useSWR('/api/sources', fetcher, { dedupingInterval: 30_000 })` | Multiple consumers share 1 request |
| `useDigest()` | `useSWR('/api/digest/today', fetcher, { revalidateOnFocus: false })` | Stale-while-revalidate |
| `useArticles()` | `useSWRInfinite(key, fetcher)` | Native infinite scroll pagination |
| Mutations (save/read) | `mutate(key)` with `optimisticData` | Cleaner than manual state rollback |

`dedupingInterval: 30_000` ensures multiple `useSources()` consumers share **one** in-flight request.

### Layer 6: Ingest Query Optimization (2h)
File: `app/src/lib/ingest/rss.ts:178-187`

Merge `existingRows` + `recentRows` queries into single UNION:
```typescript
const existing = db.select().from(articles)
  .where(or(
    inArray(articles.id, ids),
    and(eq(articles.sourceId, sourceId), gte(articles.fetchedAt, cutoff))
  ))
  .all();
```

---

## Implementation Order

1. **Layer 1** (PRAGMA) — immediate, trivial, no risk
2. **Layer 4** (indexes) — run migration before heavy queries
3. **Layer 2** (React.memo) — isolated component changes, safe
4. **Layer 3** (API cache) — server-side only, no client impact
5. **Layer 5** (SWR) — largest refactor; hooks one-at-a-time, starting with `useSources`
6. **Layer 6** (ingest) — last, low-risk isolated change

---

## Impact Estimate

| Layer | API latency | Render perf | Ingest |
|---|---|---|---|
| PRAGMA | -10–20% query time | — | -5–10% |
| React.memo | — | -40–60% re-renders | — |
| API cache | -30–50% latency | — | — |
| DB indexes | -20–40% query time | — | -15% dedup |
| SWR | — | instant stale-hit | — |
| Ingest join | — | — | -10% |

**Total effort:** ~3–4 days. Single new dependency: `swr`.

---

## Success Criteria

- [ ] GET /api/articles response time < 50ms (currently ~80–120ms estimated)
- [ ] Filter/source switch shows stale content instantly, then updates silently
- [ ] No duplicate /api/sources requests when multiple components mount
- [ ] Article list does not re-render when unrelated parent state changes (verify with React DevTools)
- [ ] Ingest dedup queries use indexes (verify with SQLite EXPLAIN QUERY PLAN)
