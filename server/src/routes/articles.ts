/** API tin tức: danh sách (lọc/tìm/phân trang) + chi tiết (kèm toàn văn). */
import { Hono } from 'hono';
import { and, eq, like, or, sql, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { articles, sources, type Source } from '../db/schema.js';
import { serializeArticle } from '../lib/serialize.js';
import { extractFullText } from '../ingest/extract.js';
import { CATEGORIES } from '../ai/classify.js';

export const articlesRoute = new Hono();

function sourceMap(): Map<string, Source> {
  return new Map(db.select().from(sources).all().map((s) => [s.id, s]));
}

articlesRoute.get('/', (c) => {
  const cat = c.req.query('cat');
  const source = c.req.query('source');
  const q = c.req.query('q')?.trim();
  const sort = c.req.query('sort') === 'hot' ? 'hot' : 'latest';
  const limit = Math.min(60, Math.max(1, Number(c.req.query('limit')) || 20));
  const offset = Math.max(0, Number(c.req.query('offset')) || 0);

  const conds = [eq(articles.aiStatus, 'ready')];
  if (cat && (CATEGORIES as readonly string[]).includes(cat)) conds.push(eq(articles.category, cat));
  if (source) conds.push(eq(articles.sourceId, source));
  if (q) {
    const pat = `%${q}%`;
    conds.push(or(like(articles.title, pat), like(articles.rawSummary, pat))!);
  }
  const where = and(...conds);

  const total = db.select({ n: sql<number>`count(*)` }).from(articles).where(where).get()?.n ?? 0;
  const orderBy = sort === 'hot' ? desc(articles.hotScore) : desc(articles.publishedAt);
  const rows = db.select().from(articles).where(where).orderBy(orderBy).limit(limit).offset(offset).all();

  const srcs = sourceMap();
  return c.json({
    total,
    items: rows.map((a) => serializeArticle(a, srcs.get(a.sourceId))),
  });
});

articlesRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const a = db.select().from(articles).where(eq(articles.id, id)).get();
  if (!a) return c.json({ error: 'not found' }, 404);

  // lazy: trích toàn văn + blocks (đoạn văn xen ảnh) nếu chưa có — phục vụ tab "Bài gốc"
  let blocks: { t: 'p' | 'img'; v: string }[] = [];
  if (a.content) {
    try {
      blocks = JSON.parse(a.content);
    } catch {
      blocks = [];
    }
  }
  if (!blocks.length) {
    const ex = await extractFullText(a.url);
    if (ex) {
      blocks = ex.blocks;
      db.update(articles)
        .set({ fullText: ex.text, content: JSON.stringify(ex.blocks) })
        .where(eq(articles.id, id))
        .run();
    }
  }
  // paragraphs giữ cho tương thích; content là nguồn chính (có ảnh)
  const paragraphs = blocks.filter((b) => b.t === 'p').map((b) => b.v);
  const src = db.select().from(sources).where(eq(sources.id, a.sourceId)).get() ?? undefined;
  return c.json({ ...serializeArticle(a, src), paragraphs, content: blocks });
});
