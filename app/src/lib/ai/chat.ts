/**
 * Chat với tin tức: rate-limit qua SQLite, build context từ 50 bài gần nhất,
 * stream plain-text answer từ Haiku. Cuối response có dòng "SOURCES: id1,id2".
 */
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client";
import { articles, chatUsage } from "../db/schema";
import { config } from "../config";
import { aiReady, streamText } from "./client";

export const CHAT_SYSTEM = `Bạn là trợ lý tin tức. Chỉ trả lời dựa trên danh sách bài báo được cung cấp.
Trả lời bằng tiếng Việt, súc tích (2-4 câu).
Cuối câu trả lời, viết trên một dòng mới riêng biệt: SOURCES: id1,id2 (tối đa 5 id bài liên quan).
Nếu không có bài nào liên quan, viết: SOURCES: none
QUAN TRỌNG: Copy CHÍNH XÁC chuỗi id từ danh sách (phần sau "id:"), không đổi ký tự nào.`;

const LIMIT = Number(process.env.CHAT_DAILY_LIMIT ?? 20);
const HOURS_48 = 48 * 3.6e6;

export interface ChatArticleRow {
  id: string;
  title: string;
  url: string;
}

/** Throws "AI_NOT_READY" | "RATE_LIMIT". Returns article rows for source hydration. */
export function prepareChatContext(date: string): {
  context: string;
  rows: ChatArticleRow[];
} {
  if (!aiReady()) throw new Error("AI_NOT_READY");

  // Atomic rate-limit upsert
  db.insert(chatUsage).values({ date, count: 1 })
    .onConflictDoUpdate({ target: chatUsage.date, set: { count: sql`${chatUsage.count} + 1` } })
    .run();
  const usage = db.select().from(chatUsage).where(eq(chatUsage.date, date)).get();
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

  const context = rows.length
    ? rows.map((r) => `id:${r.id} | [${r.category}] ${r.title} — ${(r.aiLead ?? "").slice(0, 120)}`).join("\n")
    : "";

  return { context, rows: rows.map((r) => ({ id: r.id, title: r.title, url: r.url })) };
}

export function chatStream(question: string, context: string): AsyncGenerator<string> {
  if (!context) {
    return (async function* () { yield "Chưa có tin nào trong 48h qua.\nSOURCES: none"; })();
  }
  return streamText({
    model: config.MODEL_FAST,
    system: CHAT_SYSTEM,
    user: `Câu hỏi: ${question}\n\nDanh sách bài báo:\n${context}`,
    maxTokens: 700,
  });
}
