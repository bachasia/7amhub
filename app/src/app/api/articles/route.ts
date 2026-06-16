export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { and, eq, like, or, sql, desc, asc, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { articles, sources, type Source } from "@/lib/db/schema";
import { serializeArticle } from "@/lib/serialize";
import { CATEGORIES } from "@/lib/ai/classify";

let _srcCache: { map: Map<string, Source>; ts: number } | null = null;
const SRC_TTL = 30_000; // 30 seconds

function sourceMap(): Map<string, Source> {
  if (_srcCache && Date.now() - _srcCache.ts < SRC_TTL) return _srcCache.map;
  const map = new Map(db.select().from(sources).all().map((s) => [s.id, s]));
  _srcCache = { map, ts: Date.now() };
  return map;
}

export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const cat = p.get("cat");
  const source = p.get("source");
  const q = p.get("q")?.trim();
  const sortParam = p.get("sort");
  const sort = sortParam === "hot" ? "hot" : sortParam === "rank" ? "rank" : "latest";
  const limit = Math.min(60, Math.max(1, Number(p.get("limit")) || 20));
  const offset = Math.max(0, Number(p.get("offset")) || 0);

  const conds = [eq(articles.aiStatus, "ready")];
  if (cat && (CATEGORIES as readonly string[]).includes(cat)) conds.push(eq(articles.category, cat));
  if (source) conds.push(eq(articles.sourceId, source));
  // sort=rank (feed trending): chỉ lấy item thuộc snapshot hiện tại (feed_order != null).
  if (sort === "rank") conds.push(isNotNull(articles.feedOrder));
  if (q) {
    const pat = `%${q}%`;
    conds.push(or(like(articles.title, pat), like(articles.rawSummary, pat))!);
  }
  const where = and(...conds);

  const total = db.select({ n: sql<number>`count(*)` }).from(articles).where(where).get()?.n ?? 0;
  const orderBy = sort === "hot" ? desc(articles.hotScore) : sort === "rank" ? asc(articles.feedOrder) : desc(articles.publishedAt);
  const rows = db.select().from(articles).where(where).orderBy(orderBy).limit(limit).offset(offset).all();

  const srcs = sourceMap();
  return NextResponse.json({ total, items: rows.map((a) => serializeArticle(a, srcs.get(a.sourceId))) });
}
