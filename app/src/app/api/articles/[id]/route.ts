export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { articles, sources } from "@/lib/db/schema";
import { serializeArticle } from "@/lib/serialize";
import { extractFullText } from "@/lib/ingest/extract";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = db.select().from(articles).where(eq(articles.id, id)).get();
  if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });

  let blocks: { t: "p" | "img"; v: string }[] = [];
  if (a.content) {
    try { blocks = JSON.parse(a.content); } catch { blocks = []; }
  }
  if (!blocks.length) {
    const ex = await extractFullText(a.url);
    if (ex) {
      blocks = ex.blocks;
      db.update(articles)
        .set({
          fullText: ex.text,
          content: JSON.stringify(ex.blocks),
          ...(!a.image && ex.image ? { image: ex.image } : {}),
        })
        .where(eq(articles.id, id))
        .run();
    }
  }

  const paragraphs = blocks.filter((b) => b.t === "p").map((b) => b.v);
  const src = db.select().from(sources).where(eq(sources.id, a.sourceId)).get() ?? undefined;
  return NextResponse.json({ ...serializeArticle(a, src), paragraphs, content: blocks });
}
