/** Trả lời câu hỏi tin tức bằng RAG context-window: 50 bài ready gần nhất → Sonnet → answer + cited ids. */
import { z } from "zod";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client";
import { articles, chatUsage } from "../db/schema";
import { config } from "../config";
import { aiReady, callJSON } from "./client";

const CHAT_SYSTEM = `Bạn là trợ lý tin tức. Chỉ trả lời dựa trên danh sách bài báo được cung cấp.
Trả lời bằng tiếng Việt, súc tích (2-4 câu). Trích dẫn id bài báo liên quan trong "sourceIds".
Nếu không có bài nào liên quan, nói thẳng "Không có tin liên quan trong hôm nay."`;

const responseSchema = z.object({
  answer: z.string(),
  sourceIds: z.array(z.string()).max(5).default([]),
});

const CHAT_INPUT_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    sourceIds: { type: "array", items: { type: "string" } },
  },
  required: ["answer", "sourceIds"],
};

const LIMIT = Number(process.env.CHAT_DAILY_LIMIT ?? 20);
const HOURS_48 = 48 * 3.6e6;

export interface ChatResponse {
  answer: string;
  sources: { id: string; title: string; url: string }[];
}

export async function chatWithNews(question: string, date?: string): Promise<ChatResponse> {
  if (!aiReady()) throw new Error("AI_NOT_READY");

  const today = date ?? new Date().toISOString().slice(0, 10);

  // SQLite atomic increment — safe under concurrent requests
  db.insert(chatUsage).values({ date: today, count: 1 })
    .onConflictDoUpdate({ target: chatUsage.date, set: { count: sql`${chatUsage.count} + 1` } })
    .run();
  const usage = db.select().from(chatUsage).where(eq(chatUsage.date, today)).get();
  if ((usage?.count ?? 0) > LIMIT) throw new Error("RATE_LIMIT");

  const since = Date.now() - HOURS_48;
  const rows = db.select({
    id: articles.id,
    title: articles.title,
    url: articles.url,
    category: articles.category,
    aiLead: articles.aiLead,
  }).from(articles)
    .where(and(eq(articles.aiStatus, "ready"), gte(articles.fetchedAt, since)))
    .orderBy(sql`${articles.hotScore} desc`)
    .limit(50)
    .all();

  if (!rows.length) return { answer: "Chưa có tin nào trong 48h qua.", sources: [] };

  const valid = new Set(rows.map((r) => r.id));
  const context = rows.map((r) =>
    `[${r.id}] [${r.category}] ${r.title} — ${(r.aiLead ?? "").slice(0, 120)}`
  ).join("\n");

  const result = await callJSON({
    model: config.MODEL_SMART,
    system: CHAT_SYSTEM,
    user: `Câu hỏi: ${question}\n\nDanh sách tin:\n${context}`,
    toolName: "tra_loi_tin_tuc",
    toolDescription: "Trả lời câu hỏi và liệt kê id bài nguồn.",
    inputSchema: CHAT_INPUT_SCHEMA,
    validator: responseSchema,
    maxTokens: 600,
  });

  const cited = rows.filter((r) => result.sourceIds.includes(r.id) && valid.has(r.id));
  return {
    answer: result.answer,
    sources: cited.map((r) => ({ id: r.id, title: r.title, url: r.url })),
  };
}
