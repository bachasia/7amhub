---
phase: 1
title: "SQLite PRAGMA + DB Indexes"
status: done
priority: P1
effort: "30m"
dependencies: []
---

# Phase 1: SQLite PRAGMA + DB Indexes

## Overview

Two micro-changes with zero risk: (1) add 5 SQLite PRAGMAs to the connection init for better WAL performance; (2) add 3 missing indexes to `schema.ts` and run migration.

## Requirements

- Functional: DB queries for trending/ingest/articles run faster
- Non-functional: No behavioral change, no new dependencies, migration safe on existing data

## Architecture

SQLite WAL mode + `synchronous=NORMAL` reduces fsync calls while maintaining crash-safe consistency. `cache_size` and `mmap_size` let SQLite use more OS page cache. `busy_timeout` prevents lock errors when worker + web process hit DB simultaneously.

Missing indexes cover:
- `feedOrder` — queried with `isNotNull` in articles route (sort=rank), currently full-scan
- `(aiStatus, feedOrder)` — composite covering trending query (WHERE aiStatus='ready' AND feedOrder IS NOT NULL)
- `(sourceId, fetchedAt)` — covering 24h dedup window query in ingest

## Related Code Files

- Modify: `app/src/lib/db/client.ts` (add 5 PRAGMAs)
- Modify: `app/src/lib/db/schema.ts` (add 3 indexes)
- Create: new Drizzle migration SQL (auto-generated)

## Implementation Steps

### 1. Add PRAGMAs to `app/src/lib/db/client.ts`

After existing pragma lines (after line 18), add:
```typescript
sqlite.pragma("synchronous = NORMAL");    // safe with WAL; fewer fsync per transaction
sqlite.pragma("cache_size = -16000");     // 16MB page cache (negative = KiB)
sqlite.pragma("mmap_size = 30000000000"); // 30GB mmap — OS handles page eviction
sqlite.pragma("temp_store = memory");     // temp tables/indexes in RAM
sqlite.pragma("busy_timeout = 5000");     // retry 5s before SQLITE_BUSY error
```

### 2. Add indexes to `app/src/lib/db/schema.ts`

In the `articles` table definition `(t) => ({...})` block, add after `bySource`:
```typescript
byFeedOrder: index("idx_articles_feed_order").on(t.feedOrder),
byStatusFeedOrder: index("idx_articles_status_feed_order").on(t.aiStatus, t.feedOrder),
bySourceFetchedAt: index("idx_articles_source_fetched_at").on(t.sourceId, t.fetchedAt),
```

### 3. Generate + apply migration

```bash
cd app
npm run db:gen      # generates new migration SQL under drizzle/
npm run db:migrate  # applies to SQLite DB
```

Verify migration file created: `app/drizzle/00XX_*.sql` containing 3 `CREATE INDEX` statements.

## Success Criteria

- [ ] `client.ts` has 5 additional `sqlite.pragma(...)` calls
- [ ] `schema.ts` articles table has 6 total indexes (3 existing + 3 new)
- [ ] New migration file present in `app/drizzle/`
- [ ] `npm run db:migrate` exits 0
- [ ] `EXPLAIN QUERY PLAN SELECT * FROM articles WHERE ai_status='ready' AND feed_order IS NOT NULL` shows `USING INDEX`

## Risk Assessment

- PRAGMA changes: zero data risk; `synchronous=NORMAL` is still crash-safe with WAL (only loses last transaction on power loss, not data corruption)
- Index creation: SQLite runs `CREATE INDEX` non-blocking for small DBs; safe on live data
- `busy_timeout`: prevents SQLITE_BUSY crashes when worker + web both write simultaneously — improvement only
