export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { articles } from "@/lib/db/schema";

export function GET(req: NextRequest) {
  const limit = Math.min(15, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 7));
  const rows = db
    .select({ tags: articles.tags })
    .from(articles)
    .where(eq(articles.aiStatus, "ready"))
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
    } catch { /* skip malformed */ }
  }

  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
  return NextResponse.json(top);
}
