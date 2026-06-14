/** API bản tin "Đề xuất 7AM": đọc digest theo ngày (hydrate article objects từ id). */
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { digests, articles, sources, type Source } from '../db/schema.js';
import { serializeArticle } from '../lib/serialize.js';
import { todayLocal } from '../lib/local-date.js';

export const digestRoute = new Hono();

interface DigestPayload {
  intro: string;
  picks: string[];
  byCat: { cat: string; ids: string[] }[];
}

digestRoute.get('/today', (c) => {
  const date = c.req.query('date') || todayLocal();
  let row = db.select().from(digests).where(eq(digests.date, date)).get();
  // nếu chưa có digest hôm nay, lấy bản gần nhất
  if (!row) row = db.select().from(digests).orderBy(digests.date).all().at(-1);
  if (!row) return c.json({ date, intro: '', picks: [], byCat: [], hasDigest: false });

  const payload = JSON.parse(row.payload) as DigestPayload;
  const ids = [...new Set([...payload.picks, ...payload.byCat.flatMap((g) => g.ids)])];
  const arts = ids.length ? db.select().from(articles).where(inArray(articles.id, ids)).all() : [];
  const srcs = new Map<string, Source>(db.select().from(sources).all().map((s) => [s.id, s]));
  const byId = new Map(arts.map((a) => [a.id, serializeArticle(a, srcs.get(a.sourceId))]));

  const hydrate = (list: string[]) => list.map((id) => byId.get(id)).filter(Boolean);
  return c.json({
    date: row.date,
    hasDigest: true,
    intro: payload.intro,
    picks: hydrate(payload.picks),
    byCat: payload.byCat.map((g) => ({ cat: g.cat, items: hydrate(g.ids) })).filter((g) => g.items.length),
  });
});
