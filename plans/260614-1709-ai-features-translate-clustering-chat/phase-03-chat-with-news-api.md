---
phase: 3
title: "Chat with News API"
status: pending
priority: P2
effort: "1d"
dependencies: []
---

# Phase 3: Chat with News API

## Overview

New `POST /api/chat` endpoint. Fetches up to 50 recent ready articles, passes them as context to Sonnet, returns Vietnamese answer + cited article IDs. Stateless per request (no session history). Rate-limited via env var.

## Requirements

- Functional:
  - `POST /api/chat` accepts `{question: string, date?: string}`
  - Returns `{answer: string, sources: {id: string, title: string, url: string}[]}`
  - Sonnet answers only from provided articles, in Vietnamese
  - Returns 1-5 cited source articles
  - Returns 400 if question empty, 503 if AI not ready
- Non-functional:
  - Max `CHAT_DAILY_LIMIT` requests/day (default 20, env configurable)
  - Rate limit stored in **SQLite** `chat_usage(date PK, count)` — safe across multiple workers
  - Context: 50 articles max (~15k tokens input, well within Sonnet's window)
  - Response time: <10s typical

## Architecture

```
POST /api/chat
  { question, date? }
        │
        ▼
  app/src/lib/ai/chat.ts
    chatWithNews(question, date?)
        │
        ├── fetch up to 50 ready articles (last 48h or by date)
        │   SELECT id, title, url, category, ai_lead, tags FROM articles
        │   WHERE ai_status='ready' ORDER BY hot_score DESC LIMIT 50
        │
        ├── build context string:
        │   "[id] [category] title — ai_lead (tags)"
        │
        ├── callJSON(Sonnet, CHAT_SYSTEM, user=question+context)
        │
        └── filter cited IDs → fetch title+url → return
        
app/src/app/api/chat/route.ts
  POST handler → calls chatWithNews → returns JSON
```

**Response shape:**
```typescript
interface ChatResponse {
  answer: string;
  sources: { id: string; title: string; url: string }[];
}
```

**Rate limit (SQLite, multi-worker safe):**
```typescript
// New table in schema.ts:
export const chatUsage = sqliteTable("chat_usage", {
  date: text("date").primaryKey(),
  count: integer("count").notNull().default(0),
});

// In chat.ts:
function checkAndIncrementLimit(today: string, limit: number): boolean {
  db.insert(chatUsage).values({ date: today, count: 1 })
    .onConflictDoUpdate({ target: chatUsage.date, set: { count: sql`count + 1` } })
    .run();
  const row = db.select().from(chatUsage).where(eq(chatUsage.date, today)).get();
  return (row?.count ?? 0) <= limit;
}
```

## Related Code Files

- Modify: `app/src/lib/db/schema.ts` — add `chatUsage` table
- Create: `app/src/lib/ai/chat.ts`
- Create: `app/src/app/api/chat/route.ts`
- Read: `app/src/lib/ai/client.ts` — callJSON signature
- Read: `app/src/lib/ai/classify.ts` — callJSON usage pattern
- Read: `app/src/lib/config.ts` — MODEL_SMART, aiReady()
- Read: `app/src/lib/db/client.ts` — db import pattern

## Implementation Steps

1. **Read** `app/src/lib/ai/client.ts`, `app/src/lib/config.ts`, `app/src/lib/db/schema.ts`, `app/src/lib/db/client.ts` for import patterns

2. **Add `chatUsage` table to `app/src/lib/db/schema.ts`** and run Drizzle migration:
   ```typescript
   export const chatUsage = sqliteTable("chat_usage", {
     date: text("date").primaryKey(),
     count: integer("count").notNull().default(0),
   });
   ```
   Run migration: check existing `package.json` scripts or `npx drizzle-kit generate && npx drizzle-kit migrate`

3. **Create `app/src/lib/ai/chat.ts`**

   ```typescript
   import { z } from "zod";
   import { and, eq, gte, sql } from "drizzle-orm";
   import { db } from "../db/client";
   import { articles, chatUsage } from "../db/schema";
   import { config, aiReady } from "../config";
   import { callJSON } from "./client";

   const CHAT_SYSTEM = `Bạn là trợ lý tin tức. Chỉ trả lời dựa trên danh sách bài báo được cung cấp.
   Trả lời bằng tiếng Việt, súc tích (2-4 câu). Trích dẫn id bài báo liên quan trong "sourceIds".
   Nếu không có bài nào liên quan, nói thẳng "Không có tin liên quan trong hôm nay."`;

   const responseSchema = z.object({
     answer: z.string(),
     sourceIds: z.array(z.string()).max(5).default([]),
   });

   const LIMIT = Number(process.env.CHAT_DAILY_LIMIT ?? 20);

   export async function chatWithNews(question: string, date?: string) {
     if (!aiReady()) throw new Error("AI_NOT_READY");
     const today = date ?? new Date().toISOString().slice(0, 10);
     // SQLite-backed rate limit (multi-worker safe)
     db.insert(chatUsage).values({ date: today, count: 1 })
       .onConflictDoUpdate({ target: chatUsage.date, set: { count: sql`${chatUsage.count} + 1` } })
       .run();
     const usage = db.select().from(chatUsage).where(eq(chatUsage.date, today)).get();
     if ((usage?.count ?? 0) > LIMIT) throw new Error("RATE_LIMIT");

     const since = Date.now() - 48 * 3.6e6;
     const rows = db.select({
       id: articles.id, title: articles.title, url: articles.url,
       category: articles.category, aiLead: articles.aiLead, tags: articles.tags,
     }).from(articles)
       .where(and(eq(articles.aiStatus, "ready"), gte(articles.fetchedAt, since)))
       .orderBy(sql`${articles.hotScore} desc`)
       .limit(50).all();

     if (!rows.length) return { answer: "Chưa có tin nào trong 48h qua.", sources: [] };

     const valid = new Set(rows.map(r => r.id));
     const context = rows.map(r =>
       `[${r.id}] [${r.category}] ${r.title} — ${(r.aiLead ?? "").slice(0, 120)}`
     ).join("\n");

     const result = await callJSON({
       model: config.MODEL_SMART,
       system: CHAT_SYSTEM,
       user: `Câu hỏi: ${question}\n\nDanh sách tin:\n${context}`,
       toolName: "tra_loi_tin_tuc",
       toolDescription: "Trả lời câu hỏi và liệt kê id bài nguồn.",
       inputSchema: {
         type: "object",
         properties: {
           answer: { type: "string" },
           sourceIds: { type: "array", items: { type: "string" } },
         },
         required: ["answer", "sourceIds"],
       },
       validator: responseSchema,
       maxTokens: 600,
     });

     const cited = rows.filter(r => result.sourceIds.includes(r.id) && valid.has(r.id));
     return {
       answer: result.answer,
       sources: cited.map(r => ({ id: r.id, title: r.title, url: r.url })),
     };
   }
   ```

2. **Create `app/src/app/api/chat/route.ts`**

   ```typescript
   import { NextRequest, NextResponse } from "next/server";
   import { chatWithNews } from "@/lib/ai/chat";

   export async function POST(req: NextRequest) {
     const body = await req.json().catch(() => ({}));
     const question = (body?.question ?? "").trim();
     if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

     try {
       const result = await chatWithNews(question, body?.date);
       return NextResponse.json(result);
     } catch (e: unknown) {
       const msg = e instanceof Error ? e.message : "unknown";
       if (msg === "RATE_LIMIT") return NextResponse.json({ error: "daily limit reached" }, { status: 429 });
       if (msg === "AI_NOT_READY") return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
       return NextResponse.json({ error: "chat failed" }, { status: 500 });
     }
   }
   ```

3. **Read Next.js docs** in `node_modules/next/dist/docs/` for Route Handler conventions before writing — per AGENTS.md requirement.

## Success Criteria

- [ ] `POST /api/chat` returns `{answer, sources}` for a valid question
- [ ] Returns 400 for empty question
- [ ] Returns 429 after exceeding `CHAT_DAILY_LIMIT` (verified via `chat_usage` table count)
- [ ] `chat_usage` table exists in DB after migration
- [ ] Returns 503 when `ANTHROPIC_API_KEY` not set
- [ ] Answer is in Vietnamese
- [ ] Sources contain only valid article IDs from the DB
- [ ] TypeScript compiles without errors

## Risk Assessment

- **Context too large**: 50 articles × ~150 chars = ~7.5k chars — safe for Sonnet (200k context)
- **Hallucinated IDs**: mitigated by `valid.has(id)` filter on cited IDs
- **Rate limit counter race**: SQLite `INSERT ... ON CONFLICT DO UPDATE` is atomic — safe under concurrent requests
- **Cost**: ~$0.005/query (Sonnet, ~8k input tokens); CHAT_DAILY_LIMIT=20 caps at ~$0.10/day
