export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { readArticles } from "@/lib/db/schema";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.insert(readArticles)
    .values({ articleId: id, readAt: Date.now() })
    .onConflictDoNothing()
    .run();
  return NextResponse.json({ ok: true });
}
