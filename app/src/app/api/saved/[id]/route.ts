export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { savedArticles } from "@/lib/db/schema";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.insert(savedArticles)
    .values({ articleId: id, createdAt: Date.now() })
    .onConflictDoNothing()
    .run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.delete(savedArticles).where(eq(savedArticles.articleId, id)).run();
  return NextResponse.json({ ok: true });
}
