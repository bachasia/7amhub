export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import Parser from "rss-parser";
import { db } from "@/lib/db/client";
import { sources, articles } from "@/lib/db/schema";

const probe = new Parser({ timeout: 12000, headers: { "User-Agent": "Mozilla/5.0 (compatible; 7AMHubBot/1.0)" } });

const bodySchema = z.object({
  label: z.string().trim().min(1),
  url: z.string().trim().min(1),
});

function normalizeUrl(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function GET() {
  const counts = new Map(
    db
      .select({ sid: articles.sourceId, n: sql<number>`count(*)` })
      .from(articles)
      .where(eq(articles.aiStatus, "ready"))
      .groupBy(articles.sourceId)
      .all()
      .map((r) => [r.sid, r.n])
  );
  const rows = db.select().from(sources).all();
  return NextResponse.json(rows.map((s) => ({ ...s, active: !!s.active, count: counts.get(s.id) ?? 0 })));
}

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Cần nhập tên nguồn và URL RSS." }, { status: 400 });
  const url = normalizeUrl(parsed.data.url);

  let siteUrl: string | null = null;
  try {
    const feed = await probe.parseURL(url);
    siteUrl = feed.link || null;
  } catch {
    return NextResponse.json({ error: "Không đọc được RSS từ URL này." }, { status: 400 });
  }

  const existing = db.select().from(sources).where(eq(sources.url, url)).get();
  if (existing) return NextResponse.json({ error: "Nguồn đã tồn tại." }, { status: 409 });

  const row = { id: "f" + Date.now(), label: parsed.data.label, url, siteUrl, active: 1, createdAt: Date.now() };
  db.insert(sources).values(row).run();
  return NextResponse.json({ ...row, active: true, count: 0 }, { status: 201 });
}
