# Feed Folder Grouping Implementation (Folo-Style)

**Date**: 2026-06-15 18:17
**Severity**: Low
**Component**: Feed management, sidebar UI, database schema
**Status**: Resolved

## What Happened

Completed 5-phase implementation of user-assigned feed folder grouping (Folo-style organizational model) in the 7am-feed news hub. Feature adds nullable `group` column to sources table, API/hook plumbing for group operations, folder-aware feed-manager UI with datalist autocomplete, and a rewritten sidebar with collapsible folder sections (default-closed, localStorage-persisted state). New feed-type filter row added above folder list.

Build chain clean: `tsc --noEmit` passed, `npm run build` passed, code-reviewer returned DONE_WITH_CONCERNS (concern addressed in place).

## The Brutal Truth

This one went smooth. No production fires, no architectural regrets, just two small snags caught before merge that reveal useful patterns for future work.

## Technical Details

**Schema**: Added `group VARCHAR(255)` nullable column to sources table with migration script backfilling existing rows to NULL. No data loss, no downtime risk.

**API Shape**: 
- GET /api/sources returns sources with `group` field
- PUT /api/sources/[id] accepts `group` in body alongside existing label/url/active updates
- Sidebar queries sources grouped by `group` value with NULL handling for ungrouped sources

**UI**:
- Feed-manager folder input uses `<datalist>` for group name autocomplete (pulls from existing groups in sources)
- Sidebar rewired from flat list to nested collapsible sections per folder
- Folder state (open/closed) persisted via localStorage with `sidebar-folder-${groupName}` keys
- Default-closed behavior prevents sidebar clutter on first load

## What We Tried

Straightforward implementation per plan. No significant pivots.

## Root Cause Analysis

Two noteworthy decisions:

**1. Icon Export Mismatch**
lucide-react v1.18.0 installed in project does NOT export a `Youtube` icon. TypeScript compilation caught the missing export immediately (`error TS2305`). Rather than downgrade or add shim, swapped the feed-type chip icon to `Video` (available in v1.18.0, semantically appropriate). Root cause: icon names from training data assumptions, not verified against `node_modules/lucide-react/package.json` exports. Lesson extracted below.

**2. API Shape Drift on Update**
PUT /api/sources/[id] returns raw database row with integer `active` flag and no computed `count` field. Sidebar binds to `source.count` for article label. When user edited a source's folder via the feed-manager dialog, the hook dispatched update and immediately re-rendered—but the response row lacked `count`, so sidebar display showed "0 articles" until page reload. Root cause: folder-editing was a new trigger path for a pre-existing API shape mismatch (other update flows didn't expose it because they didn't immediately re-render derived UI). Fix: in the hook, preserve the existing `count` and `active` from the previous source state on update. Folder edits never change article counts, so the preservation is semantically safe. Avoids the cost of a follow-up query.

## Lessons Learned

1. **Lucide Icon Verification**: Do not assume icon names from docs or training data. On any lucide version bump or new icon use, verify the export exists:
   ```bash
   grep -o "export.*Icon" node_modules/lucide-react/dist/esm/icons/index.d.ts | head -20
   # or inspect in code: import { Youtube } will throw immediately
   ```
   Saves 10 min of "why is tsc angry?" debugging.

2. **API Response Shapes as Contracts**: When an endpoint returns a partial shape (e.g., PUT returns DB row, not full entity), document it and ensure all callers account for missing fields. The bug here was that UI assumed `count` on every fetch path. Either: (a) normalize the response shape server-side, or (b) explicitly handle missing fields in the hook (as we did). The former is cleaner long-term but requires more refactoring; the latter is a pragmatic patch when the mismatch only affects one new flow.

3. **Preserve-on-Partial-Update Pattern**: When updating a subset of fields, preserve the unchanged computed fields in the hook rather than querying the DB again. Reduces queries, and the semantics are explicit in code: "folder edits don't change article counts."

## Next Steps

- None blocking. Feature is shipped and verified.
- Future: Consider normalizing API response shapes (return full source entity + count from all endpoints) as technical debt item to prevent similar shape drifts.
- Monitor sidebar folder state serialization; localStorage keys are keyed by group name—if a group is renamed or deleted, stale localStorage entries will accumulate (non-blocking, can be cleaned up on next UX pass).

---

**Verification:**
- tsc --noEmit: ✅ Clean
- npm run build: ✅ Passed
- code-reviewer: ✅ DONE_WITH_CONCERNS (icon swap + hook preservation pattern addressed)
