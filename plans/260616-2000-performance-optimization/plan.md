---
title: "Performance Optimization: SQLite, React, API Cache, SWR"
description: "Full-stack proactive perf: PRAGMA tuning, DB indexes, React.memo, server-side API cache, SWR client cache, ingest query consolidation"
status: done
priority: P2
branch: "main"
tags: ["performance", "swr", "sqlite", "react"]
blockedBy: []
blocks: []
created: "2026-06-16T13:17:03.271Z"
createdBy: "ck:plan"
source: skill
---

# Performance Optimization: SQLite, React, API Cache, SWR

## Overview

Proactive, code-only performance optimization across 6 layers. No critical pain points — opportunistic improvements identified through audit. Single new dependency: `swr` (~4KB). No infra changes, SQLite retained.

**Context:** `plans/reports/brainstorm-260616-2000-performance-optimization-report.md`

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 1 | [SQLite PRAGMA + DB Indexes](./phase-01-sqlite-pragma-db-indexes.md) | Pending | 30m |
| 2 | [React Memoization](./phase-02-react-memoization.md) | Pending | 1h |
| 3 | [API Server Cache](./phase-03-api-server-cache.md) | Pending | 2h |
| 4 | [SWR: useSources + useDigest](./phase-04-swr-usesources-usedigest.md) | Pending | 3h |
| 5 | [SWR: useArticles (Infinite)](./phase-05-swr-usearticles-infinite.md) | Pending | 4h |
| 6 | [Ingest Query Optimization](./phase-06-ingest-query-optimization.md) | Pending | 1h |

## Dependencies

No cross-plan dependencies. AI features plan (`260614-1709`) touches only new files (`/api/chat`, clustering UI) — no file overlap.

## Impact Summary

| Layer | API latency | Render perf | Ingest |
|---|---|---|---|
| Phase 1 (PRAGMA + indexes) | -20–40% | — | -15% dedup |
| Phase 2 (React.memo) | — | -40–60% re-renders | — |
| Phase 3 (API cache) | -30–50% | — | — |
| Phase 4–5 (SWR) | — | instant stale-hit | — |
| Phase 6 (ingest join) | — | -10% ingest | — |

## Validation Log

### Session 1 — 2026-06-16
**Trigger:** Post-plan validation interview
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Phase 5 revalidation strategy — `revalidateFirstPage: false` means new articles don't show while browsing.
   - Options: Keep false | false + refreshInterval 60s | false + visible Refresh button
   - **Answer:** `revalidateFirstPage: false` + visible Refresh button
   - **Rationale:** Smooth scroll is priority; Refresh button gives explicit user control without background polling.

2. **[Assumptions]** Phase 3 TTL — 30s for module-level sourceMap cache and unstable_cache.
   - Options: 30s | 60s
   - **Answer:** 30s — `revalidateTag` is primary invalidation, TTL is fallback.

3. **[Architecture]** Phase 4 `revalidateOnFocus` for useSources.
   - Options: false (fewer fetches) | true (match current behavior)
   - **Answer:** `true` — preserve existing behavior where sources refresh on tab focus.

4. **[Tradeoffs]** Phase 6 conservative title dedup — slightly wider than original.
   - Options: Accept conservative | Keep 2 queries
   - **Answer:** Accept conservative dedup.

#### Confirmed Decisions
- Phase 5 `revalidateFirstPage: false` + Refresh button in consumers
- Phase 4 `revalidateOnFocus: true` for useSources
- Phase 3 TTL: 30s confirmed
- Phase 6 conservative merged-query dedup: accepted

#### Action Items
- [x] Phase 5: Updated requirements + step 5 for Refresh button wiring
- [x] Phase 4: `revalidateOnFocus: true` in useSources config (both Architecture and code snippet)
- [x] Phase 4: Fixed self-referential type import comment in useDigest rewrite

#### Impact on Phases
- Phase 4: `revalidateOnFocus: true` in useSources; type definitions clarified
- Phase 5: `reload` must be wired to Refresh button in feed-view.tsx + hub-view.tsx

### Verification Results
- **Tier:** Full (6 phases)
- **Claims checked:** 28
- **Verified:** 27 | **Failed:** 0 | **Unverified:** 1

#### Unverified
1. [Scope Auditor] `_srcCache` module-level in Next.js dev mode: hot-reload may reset cache between saves. Production behavior is stable. No fix needed — noted as expected dev-mode trade-off.

### Whole-Plan Consistency Sweep
- Files reread: plan.md, phase-01 through phase-06
- Decision deltas checked: 4
- Reconciled stale references: 3 (revalidateOnFocus in Architecture + code snippet + inline comment)
- Unresolved contradictions: 0
