---
title: "AI Features: Auto-translate, Article Clustering, Chat with News"
description: "3 AI enhancements: verify Vietnamese output quality, digest-time event clustering, context-RAG chat panel"
status: pending
priority: P2
branch: "main"
tags: ["ai", "vietnamese", "clustering", "chat", "rag"]
blockedBy: []
blocks: []
created: "2026-06-14T10:14:47.480Z"
createdBy: "ck:plan"
source: skill
---

# AI Features: Auto-translate, Article Clustering, Chat with News

> Brainstorm report: [plans/reports/brainstorm-260614-1709-ai-features-report.md](../reports/brainstorm-260614-1709-ai-features-report.md)

## Overview

3 AI features built on top of existing Haiku/Sonnet pipeline:

1. **Vietnamese Output Audit** — `classify.ts` already has Vietnamese prompts; this phase verifies quality and fills gaps (tags language, `points` consistency).
2. **Article Clustering** — Add event-grouping step to `buildDigest()`. Claude receives same-day articles and returns clusters (same event, multiple sources). Stored in digest `payload.clusters`.
3. **Chat with News** — New `POST /api/chat` + `ChatPanel` component. Context-window RAG: last 50 ready articles sent to Sonnet, returns answer + cited article IDs.

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 1 | [Vietnamese Output Audit](./phase-01-auto-translate-vietnamese.md) | Pending | 0.5d |
| 2 | [Article Clustering](./phase-02-article-clustering.md) | Pending | 1.5d |
| 3 | [Chat with News API](./phase-03-chat-with-news-api.md) | Pending | 1d |
| 4 | [Chat UI](./phase-04-chat-ui.md) | Pending | 1d |

## Key Files

| File | Role |
|------|------|
| `app/src/lib/ai/classify.ts` | Haiku per-article (Phase 1) |
| `app/src/lib/ai/digest.ts` | Sonnet digest job (Phase 2) |
| `app/src/lib/ai/chat.ts` | New chat helper (Phase 3) |
| `app/src/app/api/chat/route.ts` | New API route (Phase 3) |
| `app/src/components/hub/chat-panel.tsx` | New UI component (Phase 4) |
| `app/src/components/hub/hub-view.tsx` | Integrate chat panel (Phase 4) |

## Dependencies

- Phases 3 & 4 are independent of Phases 1 & 2 — can run in parallel if needed.
- Phase 4 depends on Phase 3 (API must exist before UI).
