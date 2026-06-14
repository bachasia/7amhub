/** API chủ đề nổi bật: tần suất tag trên các bài ready gần đây (top N). */
import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { articles } from '../db/schema.js';

export const trendingRoute = new Hono();

trendingRoute.get('/', (c) => {
  const limit = Math.min(15, Math.max(1, Number(c.req.query('limit')) || 7));
  const rows = db
    .select({ tags: articles.tags })
    .from(articles)
    .where(eq(articles.aiStatus, 'ready'))
    .orderBy(desc(articles.fetchedAt))
    .limit(300)
    .all();

  const freq = new Map<string, number>();
  for (const r of rows) {
    if (!r.tags) continue;
    try {
      for (const t of JSON.parse(r.tags) as string[]) {
        const key = t.trim();
        if (key) freq.set(key, (freq.get(key) ?? 0) + 1);
      }
    } catch {
      /* bỏ qua tag lỗi */
    }
  }
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
  return c.json(top);
});
