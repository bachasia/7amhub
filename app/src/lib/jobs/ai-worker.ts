/**
 * Worker xử lý bài ai_status=pending: trích toàn văn → gọi Haiku phân loại+tóm tắt → cập nhật DB sang ready.
 * Bài lỗi được thử lại tối đa MAX_TRIES lần rồi đánh dấu failed.
 */
import cron from "node-cron";
import { and, eq, lt, or } from "drizzle-orm";
import { db } from "../db/client";
import { articles } from "../db/schema";
import { config } from "../config";
import { aiReady } from "../ai/client";
import { analyzeArticle } from "../ai/classify";
import { extractFullText } from "../ingest/extract";
import { baseHotScore } from "../hot-score";
import { mapLimit } from "../concurrency";

const MAX_TRIES = 3;
const CONCURRENCY = 3;
let running = false;

function pickPending(limit: number) {
  return db
    .select()
    .from(articles)
    .where(and(eq(articles.aiStatus, "pending"), lt(articles.aiTries, MAX_TRIES)))
    .orderBy(articles.fetchedAt)
    .limit(limit)
    .all();
}

/** Trang repo GitHub (github.com/owner/repo): README dài, không phải "bài báo" → bỏ extract. */
function isRepoPage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "github.com" && /^\/[^/]+\/[^/]+\/?$/.test(u.pathname);
  } catch { return false; }
}

async function processOne(a: typeof articles.$inferSelect): Promise<boolean> {
  // YouTube watch + repo trending: Readability fail/garbage hoặc README dài → bỏ qua extract,
  // dùng rawSummary (description ngắn) làm input classify.
  const skipExtract = a.url.includes("youtube.com/watch") || isRepoPage(a.url);
  let fullText = a.fullText;
  if (!fullText && !skipExtract) {
    const ex = await extractFullText(a.url);
    if (ex) {
      fullText = ex.text;
      db.update(articles)
        .set({
          fullText,
          content: JSON.stringify(ex.blocks),
          ...(!a.image && ex.image ? { image: ex.image } : {}),
        })
        .where(eq(articles.id, a.id))
        .run();
    }
  }
  const text = fullText || a.rawSummary || "";

  try {
    const r = await analyzeArticle({ title: a.title, text });
    const hot = baseHotScore({ publishedAt: a.publishedAt, hasImage: !!a.image, textLen: text.length });
    db.update(articles)
      .set({
        category: r.category,
        tags: JSON.stringify(r.tags),
        aiTitle: r.viTitle || null,
        aiLead: r.lead,
        aiPoints: JSON.stringify(r.points),
        hotScore: hot,
        aiStatus: "ready",
      })
      .where(eq(articles.id, a.id))
      .run();
    return true;
  } catch {
    const tries = a.aiTries + 1;
    db.update(articles)
      .set({ aiTries: tries, aiStatus: tries >= MAX_TRIES ? "failed" : "pending" })
      .where(eq(articles.id, a.id))
      .run();
    return false;
  }
}

/** Xử lý một batch pending. Trả {done, failed}. */
export async function processPending(limit = 12): Promise<{ done: number; failed: number }> {
  if (!aiReady()) return { done: 0, failed: 0 };
  if (running) return { done: 0, failed: 0 };
  running = true;
  try {
    const batch = pickPending(limit);
    if (!batch.length) return { done: 0, failed: 0 };
    const oks = await mapLimit(batch, CONCURRENCY, processOne);
    const done = oks.filter(Boolean).length;
    const failed = oks.length - done;
    console.log(`[ai] xử lý ${oks.length} bài → ${done} ok, ${failed} lỗi`);
    return { done, failed };
  } finally {
    running = false;
  }
}

export function startAiWorkerCron(): void {
  if (!aiReady()) {
    console.warn("[ai] worker tắt (chưa có API key)");
    return;
  }
  cron.schedule(config.AI_WORKER_CRON, () => void processPending(), { timezone: config.TZ });
  console.log(`[ai] worker cron: ${config.AI_WORKER_CRON} (${config.TZ})`);
}

/** Đếm số bài còn pending (cho endpoint ops/health). */
export function pendingCount(): number {
  return db
    .select({ id: articles.id })
    .from(articles)
    .where(or(eq(articles.aiStatus, "pending"), eq(articles.aiStatus, "failed")))
    .all().length;
}
