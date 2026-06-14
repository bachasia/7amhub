/** API quản lý nguồn RSS (Feed Manager): liệt kê + thêm/sửa/xoá. */
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import Parser from 'rss-parser';
import { db } from '../db/client.js';
import { sources, articles } from '../db/schema.js';

export const sourcesRoute = new Hono();
const probe = new Parser({ timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 7AMHubBot/1.0)' } });

const bodySchema = z.object({
  label: z.string().trim().min(1),
  url: z.string().trim().min(1),
});

function normalizeUrl(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

sourcesRoute.get('/', (c) => {
  // count = số bài ĐÃ sẵn sàng (ready) — khớp với những gì feed hiển thị
  const counts = new Map(
    db
      .select({ sid: articles.sourceId, n: sql<number>`count(*)` })
      .from(articles)
      .where(eq(articles.aiStatus, 'ready'))
      .groupBy(articles.sourceId)
      .all()
      .map((r) => [r.sid, r.n]),
  );
  const rows = db.select().from(sources).all();
  return c.json(rows.map((s) => ({ ...s, active: !!s.active, count: counts.get(s.id) ?? 0 })));
});

sourcesRoute.post('/', async (c) => {
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Cần nhập tên nguồn và URL RSS.' }, 400);
  const url = normalizeUrl(parsed.data.url);

  // xác minh URL là RSS hợp lệ + lấy homepage thật (cho favicon) trước khi lưu
  let siteUrl: string | null = null;
  try {
    const feed = await probe.parseURL(url);
    siteUrl = feed.link || null;
  } catch {
    return c.json({ error: 'Không đọc được RSS từ URL này.' }, 400);
  }

  const existing = db.select().from(sources).where(eq(sources.url, url)).get();
  if (existing) return c.json({ error: 'Nguồn đã tồn tại.' }, 409);

  const row = { id: 'f' + Date.now(), label: parsed.data.label, url, siteUrl, active: 1, createdAt: Date.now() };
  db.insert(sources).values(row).run();
  return c.json({ ...row, active: true, count: 0 }, 201);
});

sourcesRoute.put('/:id', async (c) => {
  const id = c.req.param('id');
  const parsed = bodySchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Dữ liệu không hợp lệ.' }, 400);
  const s = db.select().from(sources).where(eq(sources.id, id)).get();
  if (!s) return c.json({ error: 'not found' }, 404);

  const next = {
    label: parsed.data.label ?? s.label,
    url: parsed.data.url ? normalizeUrl(parsed.data.url) : s.url,
  };
  db.update(sources).set(next).where(eq(sources.id, id)).run();
  return c.json({ ...s, ...next });
});

sourcesRoute.delete('/:id', (c) => {
  const id = c.req.param('id');
  db.delete(sources).where(eq(sources.id, id)).run();
  // giữ lại bài cũ của nguồn (không xoá) — chỉ ngừng cập nhật
  return c.json({ ok: true });
});
