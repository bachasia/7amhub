---
phase: 6
title: "Ingest Query Optimization"
status: done
priority: P3
effort: "1h"
dependencies: [1]
---

# Phase 6: Ingest Query Optimization

## Overview

Merge two separate DB queries in the normal-source ingest path (`existingRows` + `recentRows`) into a single query using an OR condition. Minor improvement — reduces DB round-trips per source during ingest cycle.

## Requirements

- Functional: Dedup logic produces identical results (same articles filtered out)
- Non-functional: One fewer DB query per source per ingest cycle; uses composite index from Phase 1

## Architecture

### Current pattern (`rss.ts:178–187`)

```typescript
// Query 1: check id + url dedup
const existingRows = db
  .select({ id: articles.id, url: articles.url })
  .from(articles)
  .where(or(inArray(articles.id, ids), inArray(articles.url, urls)))
  .all();

// Query 2: check title dedup within 24h window for this source
const recentRows = db
  .select({ title: articles.title })
  .from(articles)
  .where(and(eq(articles.sourceId, sourceId), gt(articles.fetchedAt, recentCutoff)))
  .all();
```

Two queries, two round-trips to SQLite per source.

### Merged pattern

Merge into one query that returns all three fields (`id`, `url`, `title`) across both conditions:

```typescript
const existingRows = db
  .select({ id: articles.id, url: articles.url, title: articles.title })
  .from(articles)
  .where(
    or(
      inArray(articles.id, ids),
      inArray(articles.url, urls),
      and(eq(articles.sourceId, sourceId), gt(articles.fetchedAt, recentCutoff))
    )
  )
  .all();
```

Then derive both sets from the merged result:

```typescript
const existingIds    = new Set(existingRows.map((r) => r.id));
const existingUrls   = new Set(existingRows.map((r) => r.url));
// For title dedup: only rows that matched the time-window condition are relevant,
// but since we SELECT all three fields, we normalize all titles conservatively.
// This is safe — extra title matches only prevent inserting duplicates, never removes valid articles.
const existingTitles = new Set(
  existingRows
    .filter((r) => r.title) // guard null titles
    .map((r) => normalizeTitle(r.title!))
);
```

The `(sourceId, fetchedAt)` composite index added in Phase 1 covers the time-window condition, making the merged query efficient.

### Trade-off note

The merged query may return slightly more rows than needed (rows that match id/url but are from a different source — those will have their title included in `existingTitles`). This is conservative: it may prevent inserting an article with a title that appeared in ANY recent result set, not just the current source. In practice this edge case is extremely rare (same article title from two different sources within 24h) and the behavior is correct (don't insert near-duplicate titles).

If strict per-source title dedup is required, keep the two-query approach and only apply index optimization. Mark this in implementation notes.

## Related Code Files

- Modify: `app/src/lib/ingest/rss.ts` (lines ~178–200, `ingestSource` function)

## Implementation Steps

### 1. Read the full `ingestSource` function

Before editing, read lines 155–210 of `app/src/lib/ingest/rss.ts` to confirm exact variable names and current structure.

### 2. Replace the two-query block

Find the block starting with `const existingRows = db...` through `const existingTitles = new Set(...)` and replace with the merged version:

```typescript
// Single query covering id/url dedup + 24h title dedup window
const existingRows = db
  .select({ id: articles.id, url: articles.url, title: articles.title })
  .from(articles)
  .where(
    or(
      inArray(articles.id, ids),
      inArray(articles.url, urls),
      and(eq(articles.sourceId, sourceId), gt(articles.fetchedAt, recentCutoff))
    )
  )
  .all();

const existingIds    = new Set(existingRows.map((r) => r.id));
const existingUrls   = new Set(existingRows.map((r) => r.url));
const existingTitles = new Set(
  existingRows.filter((r) => r.title).map((r) => normalizeTitle(r.title!))
);
```

Remove the original `recentRows` query and its derived `existingTitles` line (now replaced).

### 3. Verify `fresh` filter is unchanged

The `fresh` filter below uses `existingIds`, `existingUrls`, `existingTitles` — these variable names are preserved. No change needed there.

### 4. Compile + type check

```bash
cd app && npx tsc --noEmit
```

`articles.title` is `text("title").notNull()` in schema — it returns `string`, not `string | null`. Remove the `.filter((r) => r.title)` guard if TypeScript infers it non-nullable (check after compile).

## Success Criteria

- [ ] `rss.ts` has one `existingRows` query (not two separate `existingRows` + `recentRows`)
- [ ] `existingIds`, `existingUrls`, `existingTitles` all derived from the single `existingRows`
- [ ] `cd app && npx tsc --noEmit` exits 0
- [ ] Manual ingest test: run `npm run dev` + trigger ingest via API or wait for cron — no duplicate articles inserted
- [ ] `EXPLAIN QUERY PLAN` on merged query shows use of `idx_articles_source_fetched_at` index

## Risk Assessment

- Conservative title dedup (slightly wider than before): safe — only ever prevents duplicates, never causes data loss.
- If `inArray(articles.id, [])` is called with empty array: existing guard at line ~239 (`if (ids.length === 0) skip`) handles this upstream. Confirm guard still applies before this query.
- Rollback: if dedup behavior needs strict per-source title scoping, revert to two queries. No schema or migration changes in this phase.
