export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { savedArticles, articles, sources } from "@/lib/db/schema";
import { serializeArticle } from "@/lib/serialize";

export function GET() {
  const saved = db.select().from(savedArticles).all();
  if (!saved.length) return NextResponse.json([]);

  const ids = saved.map((s) => s.articleId);
  const arts = db.select().from(articles).where(inArray(articles.id, ids)).all();
  const srcs = new Map(db.select().from(sources).all().map((s) => [s.id, s]));
  const byId = new Map(arts.map((a) => [a.id, serializeArticle(a, srcs.get(a.sourceId))]));

  return NextResponse.json(
    saved
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => byId.get(s.articleId))
      .filter(Boolean)
  );
}
