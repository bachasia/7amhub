# Brainstorm Report: AI Features — Auto-translate, Clustering, Chat
**Date:** 2026-06-14 | **Project:** 7AM Hub

## Problem Statement
App has solid RSS + AI classify + daily digest pipeline. Missing: Vietnamese-language output, event clustering across sources, conversational news query.

## Codebase Context
- Stack: Next.js 16, SQLite (Drizzle), Claude Haiku/Sonnet
- AI pipeline: Haiku (per-article classify) + Sonnet (daily digest)
- Entities: sources, articles (ai_lead, ai_points, tags), digests, saved/read state
- No vector DB, no auth, no user accounts

---

## Feature 1: Auto-Translate (Vietnamese Output)

**Requirement:** AI summaries (`ai_lead`, `ai_points`) output in Vietnamese

**Decision: Option C — Change Haiku prompt language**
- Change classification prompt to respond in Vietnamese
- No schema migration, no extra columns, no extra API calls
- Trade-off: loses bilingual capability (acceptable for MVP)
- Upgrade path: add `ai_lead_vi` column later if bilingual needed

**Acceptance criteria:**
- `ai_lead` and `ai_points` values in Vietnamese for new articles
- Existing English articles unchanged (no backfill required)
- Zod validation still passes

---

## Feature 2: Article Clustering

**Requirement:** Group articles about same event (e.g. Apple news from 5 sources → 1 event)

**Decision: Option B — Digest-time clustering via Claude**
- Add clustering step to daily digest job (runs at 7AM)
- Claude receives same-day articles → returns event groups
- Store as `clusters` JSON field in digest OR new `clusters` table
- Displayed in UI: collapsed event cards with source count

**Acceptance criteria:**
- Digest includes `clusters` array: `[{event_title, article_ids, sources}]`
- UI shows clustered view option on HubView
- Fallback: if clustering fails, digest works normally (graceful degradation)

---

## Feature 3: Chat with News (Context RAG)

**Requirement:** User asks questions, Claude answers using today's articles

**Decision: Option A — Context window RAG (no vector DB)**
- New API: `POST /api/chat` — takes `{question, date?}`
- Fetches up to 50 recent articles (title + ai_lead + tags + url)
- Passes to Claude Sonnet with system prompt: "Answer based only on these articles"
- Returns answer + source citations (article ids)
- UI: chat panel in HubView sidebar or modal

**Acceptance criteria:**
- User asks Vietnamese question → Claude responds in Vietnamese with sources
- Response cites article IDs → UI renders clickable links to source articles
- Rate limit or cost guard: max 20 chat turns/day (env var configurable)

**Upgrade path (when needed):** Add `sqlite-vec` embeddings for longer history search

---

## Implementation Order

| Phase | Feature | Estimated effort |
|-------|---------|----------------|
| 1 | Auto-translate (prompt change) | 0.5 day |
| 2 | Article clustering (digest step) | 1.5 days |
| 3 | Chat with news (API + UI) | 2-3 days |

## Risks
- Clustering LLM call adds ~$0.01/day cost (negligible)
- Chat feature: token cost per query ~$0.005 (Sonnet, 50 articles); monitor usage
- Vietnamese prompt quality: Haiku output may be inconsistent → test with sample articles

## Open Questions
- Should clustering UI replace or supplement current article list?
- Chat: persistent history or stateless per-session?
