---
phase: 2
title: "Article Clustering"
status: pending
priority: P2
effort: "1.5d"
dependencies: []
---

# Phase 2: Article Clustering

## Overview

Add event-grouping to the daily digest. Claude receives same-day ready articles and groups those covering the same event. Clusters stored in `digest.payload.clusters`. UI adds a "Sự kiện" (Events) view to HubView/DigestView.

## Requirements

- Functional:
  - `buildDigest()` adds a clustering step after existing picks/byCat
  - Each cluster: `{event: string, articleIds: string[], sources: string[]}`
  - Minimum 2 articles to form a cluster
  - Graceful degradation: if clustering call fails, digest proceeds without clusters
- Non-functional:
  - 1 extra Sonnet call/day (~$0.01 cost)
  - No DB schema migration (clusters stored in existing `payload` JSON)
  - Clustering must complete within 30s

## Architecture

```
buildDigest()
  ├── [existing] picks + byCat call (Sonnet)
  └── [NEW] clustering call (Sonnet)
        ├── input: same article list (id, title, source, category)
        └── output: clusters[] → merged into DigestPayload
```

`DigestPayload` type extended:
```typescript
interface ClusterGroup {
  event: string;       // e.g. "Apple ra mắt iPhone 17 tại WWDC"
  articleIds: string[]; // ≥2 article ids from valid set
  sources: string[];   // source labels for display
}

interface DigestPayload {
  intro: string;
  picks: string[];
  byCat: { cat: Category; ids: string[] }[];
  clusters: ClusterGroup[]; // NEW — optional ([] if clustering fails)
}
```

## Related Code Files

- Modify: `app/src/lib/ai/digest.ts` — add clustering step + extend DigestPayload
- Read: `app/src/lib/ai/client.ts` — callJSON signature for new call
- Read: `app/src/lib/db/schema.ts` — no changes, clusters in payload JSON
- Modify: `app/src/components/hub/hub-view.tsx` — add cluster tab/toggle
- Modify: `app/src/components/hub/trending-panel.tsx` OR create: `app/src/components/hub/cluster-panel.tsx`

## Implementation Steps

1. **Extend types in `digest.ts`**
   - Add `ClusterGroup` interface
   - Add `clusters: ClusterGroup[]` to `DigestPayload`
   - Add `clusters` to `digestSchema` (Zod): `z.array(...).default([])`

2. **Add `clusteringSchema` and `CLUSTER_INPUT_SCHEMA`** in `digest.ts`:
   ```typescript
   const clusteringSchema = z.object({
     clusters: z.array(z.object({
       event: z.string(),
       articleIds: z.array(z.string()).min(2),
     })).default([]),
   });
   ```

3. **Add `CLUSTER_SYSTEM` prompt** (Vietnamese):
   ```
   "Bạn là biên tập viên. Từ danh sách tin, hãy nhóm các bài viết về CÙNG MỘT SỰ KIỆN
   (ít nhất 2 bài từ các nguồn khác nhau). Mỗi nhóm gồm: tên sự kiện ngắn gọn + danh sách id.
   Nếu không có nhóm nào, trả về clusters rỗng."
   ```

4. **Call clustering after main digest call** in `buildDigest()`:
   ```typescript
   let clusters: ClusterGroup[] = [];
   try {
     const clusterResult = await callJSON({ ... });
     clusters = clusterResult.clusters
       .filter(c => c.articleIds.every(id => valid.has(id)) && c.articleIds.length >= 2)
       .map(c => ({
         ...c,
         sources: [...new Set(c.articleIds.map(id => sourceMap.get(id) ?? ""))].filter(Boolean),
       }));
   } catch { /* graceful degradation */ }
   ```

5. **Build `sourceMap`** via JOIN in the `buildDigest()` select query:
   ```typescript
   // Add to select in buildDigest():
   sourceLabel: sources.label,
   // Add to .from(articles):
   .leftJoin(sources, eq(articles.sourceId, sources.id))
   ```
   Then: `const sourceMap = new Map(recent.map(r => [r.id, r.sourceLabel ?? ""]))`

6. **Include `clusters` in saved payload** and returned DigestPayload

7. **UI: add cluster view to DigestView or HubView**
   - New tab or toggle: "Theo sự kiện" / "Theo danh mục"
   - Cluster card: event title + N nguồn badge + collapsed article list
   - If `clusters.length === 0`, hide the tab

## Success Criteria

- [ ] `buildDigest()` returns payload with `clusters` array
- [ ] Each cluster has ≥2 valid article IDs
- [ ] Clustering failure does not break digest (try/catch)
- [ ] UI shows "Theo sự kiện" tab when clusters exist
- [ ] TypeScript compiles without errors

## Risk Assessment

- **Hallucinated IDs**: mitigated by `valid.has(id)` filter (same as picks filter pattern)
- **Clustering call timeout**: 30s timeout on `callJSON`; graceful degradation if throws
- **Empty clusters**: UI hides tab when `clusters.length === 0` — no visual regression
- **Cost**: ~1 extra Sonnet call/day, negligible ($0.01/day estimate)
