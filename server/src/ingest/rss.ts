/**
 * Fetch + parse RSS server-side (không qua proxy công cộng).
 * Mỗi item RSS → bản ghi `articles` ở trạng thái ai_status=pending để AI worker xử lý sau.
 * Dedupe theo id (guid||link): bài đã có trong DB sẽ bị bỏ qua → không tốn AI lại.
 */
import Parser from 'rss-parser';
import { inArray, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { articles, sources, type Source } from '../db/schema.js';
import { stripHtml, firstImage } from '../lib/html.js';

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 7AMHubBot/1.0)' },
  customFields: { item: [['media:content', 'mediaContent', { keepArray: true }]] },
});

export interface ParsedItem {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  rawSummary: string | null;
  image: string | null;
  publishedAt: number | null;
}

function parseItem(item: Parser.Item & Record<string, any>, src: Source): ParsedItem | null {
  const url = (item.link || '').trim();
  const title = (item.title || '').trim();
  if (!url || !title) return null;

  const html = item['content:encoded'] || item.content || item.summary || '';
  const desc = stripHtml(html);
  const enclosure = item.enclosure?.url;
  const media = item.mediaContent?.[0]?.$?.url;
  const image = firstImage(html) || enclosure || media || null;

  const pub = item.isoDate || item.pubDate;
  const ts = pub ? new Date(pub).getTime() : NaN;

  return {
    id: (item.guid || url).trim(),
    sourceId: src.id,
    title,
    url,
    rawSummary: desc || null,
    image,
    publishedAt: Number.isNaN(ts) ? null : ts,
  };
}

async function fetchSource(src: Source): Promise<ParsedItem[]> {
  const feed = await parser.parseURL(src.url);
  // Backfill homepage thật của báo (cho favicon) nếu chưa có — feed.link trỏ về site gốc
  // (vd feedburner: feeds.feedburner.com/tinhte → tinhte.vn).
  if (!src.siteUrl && feed.link) {
    db.update(sources).set({ siteUrl: feed.link }).where(eq(sources.id, src.id)).run();
  }
  return (feed.items || [])
    .map((it) => parseItem(it as any, src))
    .filter((x): x is ParsedItem => x !== null);
}

/** Fetch tất cả nguồn active, dedupe, insert bài mới. Trả thống kê. */
export async function ingestAll(): Promise<{ inserted: number; failed: number; sources: number }> {
  const active = db.select().from(sources).where(eq(sources.active, 1)).all();
  if (!active.length) return { inserted: 0, failed: 0, sources: 0 };

  const results = await Promise.allSettled(active.map(fetchSource));
  const failed = results.filter((r) => r.status === 'rejected').length;
  const items = results
    .filter((r): r is PromiseFulfilledResult<ParsedItem[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  if (!items.length) return { inserted: 0, failed, sources: active.length };

  // gộp trùng id trong cùng lượt fetch
  const uniq = new Map<string, ParsedItem>();
  for (const it of items) if (!uniq.has(it.id)) uniq.set(it.id, it);
  const ids = [...uniq.keys()];

  // loại bài đã tồn tại trong DB
  const existing = new Set(
    ids.length
      ? db
          .select({ id: articles.id })
          .from(articles)
          .where(inArray(articles.id, ids))
          .all()
          .map((r) => r.id)
      : [],
  );

  const now = Date.now();
  const fresh = [...uniq.values()].filter((it) => !existing.has(it.id));
  if (fresh.length) {
    db.insert(articles)
      .values(fresh.map((it) => ({ ...it, fetchedAt: now })))
      .run();
  }
  return { inserted: fresh.length, failed, sources: active.length };
}
