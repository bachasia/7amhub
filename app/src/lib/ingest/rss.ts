/**
 * Fetch + parse RSS server-side.
 * Mỗi item RSS → bản ghi `articles` ở trạng thái ai_status=pending để AI worker xử lý sau.
 * Dedupe 3 lớp: id (guid||link), url, và normalized title — tránh duplicate khi feed trả
 * GUID ngẫu nhiên hoặc publish cùng story nhiều lần với title/URL hơi khác nhau.
 */
import Parser from "rss-parser";
import { inArray, eq, or, and, gt } from "drizzle-orm";
import { db } from "../db/client";
import { articles, sources, type Source } from "../db/schema";
import { stripHtml, firstImage } from "../html";

/** Chuẩn hóa title để so sánh: lowercase, bỏ ký tự đặc biệt, collapse spaces. */
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; 7AMHubBot/1.0)" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:group", "mediaGroup"], // YouTube Atom: gói thumbnail + description
    ],
  },
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
  const url = (item.link || "").trim();
  const title = (item.title || "").trim();
  if (!url || !title) return null;

  const html = item["content:encoded"] || item.content || item.summary || "";
  const desc = stripHtml(html);
  const enclosure = item.enclosure?.url;
  const media = item.mediaContent?.[0]?.$?.url;
  const image = firstImage(html) || enclosure || media || null;

  // YouTube fields từ <media:group> (thumbnail + description) — fallback khi feed thường không có.
  const mg = item.mediaGroup;
  const ytThumbnail =
    mg?.["media:thumbnail"]?.[0]?.["$"]?.url ||
    mg?.["media:thumbnail"]?.["$"]?.url ||
    null;
  const ytDesc =
    mg?.["media:description"]?.[0] ||
    mg?.["media:description"] ||
    null;

  const pub = item.isoDate || item.pubDate;
  const ts = pub ? new Date(pub).getTime() : NaN;

  return {
    id: (item.guid || url).trim(),
    sourceId: src.id,
    title,
    url,
    rawSummary: desc || (ytDesc ? String(ytDesc).trim() : null),
    image: image || ytThumbnail || null,
    publishedAt: Number.isNaN(ts) ? null : ts,
  };
}

async function fetchSource(src: Source): Promise<ParsedItem[]> {
  const feed = await parser.parseURL(src.url);
  if (!src.siteUrl && feed.link) {
    db.update(sources).set({ siteUrl: feed.link }).where(eq(sources.id, src.id)).run();
  }
  return (feed.items || [])
    .map((it) => parseItem(it as any, src))
    .filter((x): x is ParsedItem => x !== null);
}

/** Fetch 1 nguồn, dedupe theo id, url VÀ normalized title, insert bài mới. Trả số bài mới. */
export async function ingestOne(sourceId: string): Promise<{ inserted: number }> {
  const src = db.select().from(sources).where(eq(sources.id, sourceId)).get();
  if (!src) throw new Error("source not found");
  const items = await fetchSource(src);
  if (!items.length) return { inserted: 0 };

  // In-batch dedup: by id then by normalized title
  const uniqById = new Map(items.map((it) => [it.id, it]));
  const seenTitles = new Set<string>();
  const uniq = new Map<string, ParsedItem>();
  for (const [id, item] of uniqById) {
    const tk = normalizeTitle(item.title);
    if (!seenTitles.has(tk)) { seenTitles.add(tk); uniq.set(id, item); }
  }

  const ids = [...uniq.keys()];
  const urls = [...uniq.values()].map((it) => it.url);
  const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;

  const existingRows = db
    .select({ id: articles.id, url: articles.url })
    .from(articles)
    .where(or(inArray(articles.id, ids), inArray(articles.url, urls)))
    .all();
  const recentRows = db
    .select({ title: articles.title })
    .from(articles)
    .where(and(eq(articles.sourceId, sourceId), gt(articles.fetchedAt, recentCutoff)))
    .all();

  const existingIds = new Set(existingRows.map((r) => r.id));
  const existingUrls = new Set(existingRows.map((r) => r.url));
  const existingTitles = new Set(recentRows.map((r) => normalizeTitle(r.title)));

  const fresh = [...uniq.values()].filter(
    (it) => !existingIds.has(it.id) && !existingUrls.has(it.url) && !existingTitles.has(normalizeTitle(it.title))
  );
  if (fresh.length) {
    db.insert(articles).values(fresh.map((it) => ({ ...it, fetchedAt: Date.now() }))).run();
  }
  return { inserted: fresh.length };
}

/** Fetch tất cả nguồn active, dedupe, insert bài mới. Trả thống kê. */
export async function ingestAll(): Promise<{ inserted: number; failed: number; sources: number }> {
  const active = db.select().from(sources).where(eq(sources.active, 1)).all();
  if (!active.length) return { inserted: 0, failed: 0, sources: 0 };

  const results = await Promise.allSettled(active.map(fetchSource));
  const failed = results.filter((r) => r.status === "rejected").length;
  const items = results
    .filter((r): r is PromiseFulfilledResult<ParsedItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  if (!items.length) return { inserted: 0, failed, sources: active.length };

  // In-batch dedup: by id first, then by (sourceId + normalized title)
  const uniqById = new Map<string, ParsedItem>();
  for (const it of items) if (!uniqById.has(it.id)) uniqById.set(it.id, it);
  const seenTitleKeys = new Set<string>();
  const uniq = new Map<string, ParsedItem>();
  for (const [id, item] of uniqById) {
    const tk = `${item.sourceId}:${normalizeTitle(item.title)}`;
    if (!seenTitleKeys.has(tk)) { seenTitleKeys.add(tk); uniq.set(id, item); }
  }

  const ids = [...uniq.keys()];
  const urls = [...uniq.values()].map((it) => it.url);
  const sourceIds = [...new Set([...uniq.values()].map((it) => it.sourceId))];
  const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;

  const existingRows = ids.length
    ? db.select({ id: articles.id, url: articles.url }).from(articles)
        .where(or(inArray(articles.id, ids), inArray(articles.url, urls))).all()
    : [];
  const recentRows = sourceIds.length
    ? db.select({ sourceId: articles.sourceId, title: articles.title }).from(articles)
        .where(and(inArray(articles.sourceId, sourceIds), gt(articles.fetchedAt, recentCutoff))).all()
    : [];

  const existingIds = new Set(existingRows.map((r) => r.id));
  const existingUrls = new Set(existingRows.map((r) => r.url));
  const existingTitleKeys = new Set(recentRows.map((r) => `${r.sourceId}:${normalizeTitle(r.title)}`));

  const now = Date.now();
  const fresh = [...uniq.values()].filter(
    (it) =>
      !existingIds.has(it.id) &&
      !existingUrls.has(it.url) &&
      !existingTitleKeys.has(`${it.sourceId}:${normalizeTitle(it.title)}`)
  );
  if (fresh.length) {
    db.insert(articles).values(fresh.map((it) => ({ ...it, fetchedAt: now }))).run();
  }
  return { inserted: fresh.length, failed, sources: active.length };
}
