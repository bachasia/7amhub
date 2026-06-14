/**
 * Worker xử lý bài ai_status=pending: trích toàn văn (nếu thiếu) → gọi Haiku phân loại+tóm tắt
 * → cập nhật DB sang ready. Mỗi bài chỉ xử lý 1 lần khi thành công (không tốn AI lại).
 * Bài lỗi được thử lại tối đa MAX_TRIES lần rồi đánh dấu failed.
 */
import cron from 'node-cron';
import { and, eq, lt, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { articles } from '../db/schema.js';
import { config } from '../lib/config.js';
import { aiReady } from '../ai/client.js';
import { analyzeArticle } from '../ai/classify.js';
import { extractFullText } from '../ingest/extract.js';
import { baseHotScore } from '../lib/hot-score.js';
import { mapLimit } from '../lib/concurrency.js';

const MAX_TRIES = 3;
const CONCURRENCY = 3;
let running = false;

function pickPending(limit: number) {
  // pending chưa quá số lần thử; failed cũ vẫn để yên
  return db
    .select()
    .from(articles)
    .where(and(eq(articles.aiStatus, 'pending'), lt(articles.aiTries, MAX_TRIES)))
    .orderBy(articles.fetchedAt)
    .limit(limit)
    .all();
}

async function processOne(a: typeof articles.$inferSelect): Promise<boolean> {
  // 1) đảm bảo có toàn văn + blocks (lazy)
  let fullText = a.fullText;
  if (!fullText) {
    const ex = await extractFullText(a.url);
    if (ex) {
      fullText = ex.text;
      db.update(articles)
        .set({
          fullText,
          content: JSON.stringify(ex.blocks),
          // bổ sung ảnh đại diện nếu RSS không kèm (vd feed Tinh Tế / FeedBurner)
          ...(!a.image && ex.image ? { image: ex.image } : {}),
        })
        .where(eq(articles.id, a.id))
        .run();
    }
  }
  const text = fullText || a.rawSummary || '';

  // 2) gọi AI
  try {
    const r = await analyzeArticle({ title: a.title, text });
    const hot = baseHotScore({
      publishedAt: a.publishedAt,
      hasImage: !!a.image,
      textLen: text.length,
    });
    db.update(articles)
      .set({
        category: r.category,
        tags: JSON.stringify(r.tags),
        aiLead: r.lead,
        aiPoints: JSON.stringify(r.points),
        hotScore: hot,
        aiStatus: 'ready',
      })
      .where(eq(articles.id, a.id))
      .run();
    return true;
  } catch (e) {
    const tries = a.aiTries + 1;
    db.update(articles)
      .set({ aiTries: tries, aiStatus: tries >= MAX_TRIES ? 'failed' : 'pending' })
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
    console.warn('[ai] worker tắt (chưa có API key)');
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
    .where(or(eq(articles.aiStatus, 'pending'), eq(articles.aiStatus, 'failed')))
    .all().length;
}
