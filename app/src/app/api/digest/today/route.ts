export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { digests, articles, sources, type Source } from "@/lib/db/schema";
import { serializeArticle } from "@/lib/serialize";
import { todayLocal } from "@/lib/local-date";

interface DigestPayload {
  intro: string;
  picks: string[];
  byCat: { cat: string; ids: string[] }[];
}

export function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || todayLocal();
  let row = db.select().from(digests).where(eq(digests.date, date)).get();
  if (!row) row = db.select().from(digests).orderBy(digests.date).all().at(-1) ?? undefined;
  if (!row) return NextResponse.json({ date, intro: "", picks: [], byCat: [], hasDigest: false });

  const payload = JSON.parse(row.payload) as DigestPayload;
  const ids = [...new Set([...payload.picks, ...payload.byCat.flatMap((g) => g.ids)])];
  const arts = ids.length ? db.select().from(articles).where(inArray(articles.id, ids)).all() : [];
  const srcs = new Map<string, Source>(db.select().from(sources).all().map((s) => [s.id, s]));
  const byId = new Map(arts.map((a) => [a.id, serializeArticle(a, srcs.get(a.sourceId))]));

  const hydrate = (list: string[]) => list.map((id) => byId.get(id)).filter(Boolean);
  return NextResponse.json({
    date: row.date,
    hasDigest: true,
    intro: payload.intro,
    picks: hydrate(payload.picks),
    byCat: payload.byCat.map((g) => ({ cat: g.cat, items: hydrate(g.ids) })).filter((g) => g.items.length),
  });
}
