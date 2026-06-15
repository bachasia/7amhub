# YouTube Feed Integration: Migration Drift Trap and Consistency Gap

**Date**: 2026-06-15 17:57
**Severity**: High (almost broke dev DB, code inconsistency in production path)
**Component**: Database migrations, AI worker, detail route, SSR article page
**Status**: Resolved

## What Happened

Completed 8-phase YouTube channel feed integration (sources.type column, RSS resolution, metadata parsing, AI skip for videos, reader-modal iframe, play badges, seeding). Pushed commit 5500b7d. During merge validation, discovered two separate problems:

1. **Migration toolchain drift**: `drizzle-kit generate` re-emitted already-applied DDL (duplicate ai_title, recreate settings table) bundled with the new type column, causing "duplicate column" error on apply.

2. **Code consistency gap**: AI worker correctly skipped full-text Readability extraction for youtube.com/watch URLs, but the detail API route (`/api/articles/[...id]`) and SSR page (`/article/[id]`) both still attempted extraction — creating a path where a watch URL could be published with empty extracted content.

## The Brutal Truth

This is the kind of problem that makes you want to flip a table. The migration drift situation is infuriating because `drizzle-kit` silently generated valid *schema snapshots* but poisoned SQL diffs. Spent 45 minutes debugging "duplicate column ai_title" only to realize the snapshot history was missing intermediate versions (0003, 0004, 0006, 0007 absent; only 0000, 0001, 0002, 0005 existed). The code consistency gap is worse — it's a subtle footgun that lives in production code right now. Anyone viewing a YouTube video detail page would see a broken article with zero extracted content because the worker skipped extraction but the route didn't know to handle that case.

## Technical Details

**Migration issue specifics:**
- Repo's `drizzle/meta/` directory: 5 snapshot files instead of 9 (missing 0003, 0004, 0006, 0007)
- When `drizzle-kit generate` ran, it diffed schema.ts against stale 0005 snapshot (last available)
- Generated 0008_modern_zombie.sql contained:
  - `CREATE TABLE settings` (already exists in current DB)
  - `ALTER TABLE articles ADD ai_title` (already applied)
  - `ALTER TABLE articles ADD ai_content_vi` (already applied)
  - `ALTER TABLE sources ADD type` (new, correct)
- Dev DB (`data/7amhub.db`) was half-migrated: had ai_title from earlier manual application, missing settings table entirely, had inconsistent `__drizzle_migrations` ledger
- Applying 0008 failed: `SQL Error: database error: duplicate column ai_title`

**Code consistency gap:**
- `ai-worker.ts` lines 103-107: correctly skips Readability for youtube.com/watch URLs
- `/api/articles/[...id]/route.ts` line 18: calls `extractArticleBody()` unconditionally for all sources
- `/article/[id]/page.tsx` line 42: calls `extractArticleBody()` unconditionally in SSR

This means: YouTube videos get published with empty `.extracted` field in Postgres (worker skips it), but detail page still tries to extract and gets null. Frontend falls back gracefully, but the data layer is inconsistent.

## What We Tried

1. Dropped dev DB and re-migrated from scratch: 0006→0007→0008 worked cleanly on fresh instance, confirming the SQL was correct but the dev DB state was corrupted
2. Attempted to manually apply just the type column via raw SQL: too risky without understanding full ledger state
3. Audited drizzle snapshot history to understand which migrations were actually applied to dev DB

## Root Cause Analysis

**Migration drift:** The repo's migration snapshot directory fell out of sync with actual database state at some point. When `drizzle-kit generate` has incomplete snapshot history, it must choose the most recent snapshot it *has* (0005), then diffs schema.ts against that. This causes it to emit all DDL changes since 0005, including changes that were already applied to the database via missing migrations (0006, 0007). The snapshot JSON was correct (0008_snapshot.json validated fine), but the generated SQL diff was poisoned.

Root cause itself: someone either deleted intermediate snapshot files manually, or a partial migration run left the snapshot directory incomplete. The migrations table was hand-seeded at some point (evidence: inconsistent entry dates).

**Code consistency gap:** The plan clearly documented "Skip AI text extraction for YouTube videos (rely on titles and summaries)" at the worker level, but didn't propagate that decision to the detail route or SSR page. Code review caught this, but it should have been caught earlier — the invariant "if worker skips extraction for type=youtube, all read paths must handle empty extracted field" was implicit, not documented in code.

## Lessons Learned

1. **Trust generated snapshots, audit generated SQL:** Drizzle's snapshot JSON is the source of truth for "what should the schema look like?" The generated migration SQL is a *diff suggestion* — always review it before applying, especially in shared repos. If you see re-creation of existing tables/columns, diff against the most recent snapshot file to understand what changed.

2. **Incomplete migration history poisons future generates:** Missing intermediate snapshots causes `generate` to emit stale diffs. If your `drizzle/meta/` directory has gaps, either restore from git history or manually backfill snapshot files before running `generate` again.

3. **Single-path assumptions are invisible bugs:** "Worker skips extraction for YouTube" only works if *all* paths that read `.extracted` field handle the empty case. Document invariants in code comments, not just in plans. Added comment to ai-worker.ts:
   ```ts
   // INVARIANT: If this skips extraction for sourceType=youtube, 
   // all read paths must handle empty extracted field in ApiArticle.extracted.
   // See: serialize.ts, /api/articles/[...id], /article/[id]
   ```

4. **Dev database state is a hidden assumption:** The dev DB corruption went undetected until merge because tests passed (they seed a fresh in-memory DB). Real dev databases can drift from migrations. Periodically validate `__drizzle_migrations` against actual schema, or keep dev DB in git for team consistency.

## Next Steps

1. ✅ Fixed: Rewrote 0008_modern_zombie.sql to contain ONLY `ALTER TABLE sources ADD type` (confirmed clean on fresh DB)
2. ✅ Fixed: Repaired dev DB in place — idempotent CREATE settings + ADD type, backfilled type='rss' for all 404 existing articles, reconciled `__drizzle_migrations` ledger
3. ✅ Fixed: Added extraction type-guard to `/api/articles/[...id]` and `/article/[id]` to match ai-worker behavior
4. ✅ Code review approved; tests green; 5500b7d merged
5. TODO: Document Drizzle snapshot/ledger validation in CONTRIBUTING.md (one-liner: "always verify `__drizzle_migrations` after pulling schema changes")

**File locations:**
- `/Users/bachasia/Data/VibeCoding/7am-feed/app/drizzle/0008_modern_zombie.sql` — clean migration
- `/Users/bachasia/Data/VibeCoding/7am-feed/app/src/lib/jobs/ai-worker.ts` — invariant comment added
- `/Users/bachasia/Data/VibeCoding/7am-feed/app/src/app/api/articles/[...id]/route.ts` — extraction guard added
- `/Users/bachasia/Data/VibeCoding/7am-feed/app/src/app/article/[id]/page.tsx` — extraction guard added
