---
phase: 1
title: "Vietnamese Output Audit"
status: pending
priority: P2
effort: "0.5d"
dependencies: []
---

# Phase 1: Vietnamese Output Audit

## Overview

`classify.ts` already outputs Vietnamese (`lead`, `points`). This phase audits output quality, ensures tags are appropriately language-consistent, and closes any gaps.

## Key Finding

`classify.ts` system prompt already specifies:
> "Viết tóm tắt khách quan bằng tiếng Việt: 1 câu 'lead' mở đầu cô đọng + tối đa 3 ý chính dạng gạch đầu dòng."

So **no prompt change needed**. Work here is quality verification + minor improvements.

## Requirements

- `ai_lead` and `ai_points` consistently Vietnamese for new articles
- Tags: brand names / proper nouns stay English (e.g. "Apple", "Tesla") — intentional, matches current convention
- `points` formatted as plain sentences (no leading dashes — stripping is done at render time)
- `digest.ts` intro already Vietnamese — verify consistency

## Architecture

No schema changes. Audit touches only:
- `app/src/lib/ai/classify.ts` — prompt tuning if needed
- `app/src/lib/ai/digest.ts` — prompt consistency check

## Related Code Files

- Read: `app/src/lib/ai/classify.ts`
- Read: `app/src/lib/ai/digest.ts`
- Modify (if needed): `app/src/lib/ai/classify.ts`

## Implementation Steps

1. Manually trigger `/api/refresh` on dev and inspect 5-10 article `ai_lead` + `ai_points` values in DB
2. Verify `points` array items are plain Vietnamese sentences (no markdown dashes)
3. Check `tags` are appropriate — brand/person names in English is acceptable
4. If `lead` or `points` occasionally output English (Haiku fallback), add explicit enforcement to SYSTEM prompt: `"QUAN TRỌNG: Toàn bộ 'lead' và 'points' phải viết bằng tiếng Việt."`
5. Verify `digest.ts` intro field is Vietnamese (already is — confirm only)
6. No backfill required for existing articles

## Success Criteria

- [ ] 10 sampled new articles all have Vietnamese `ai_lead`
- [ ] 10 sampled new articles have Vietnamese `ai_points` items
- [ ] No regressions in Zod validation (schema unchanged)
- [ ] `digest.intro` is Vietnamese

## Risk Assessment

Low risk — read-only audit, prompt-only change if needed. Zod schema unchanged.
