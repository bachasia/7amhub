export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { articles } from "@/lib/db/schema";
import { pendingCount } from "@/lib/jobs/ai-worker";
import { aiReady } from "@/lib/ai/client";

export function GET() {
  const total = db.select({ n: sql<number>`count(*)` }).from(articles).get()?.n ?? 0;
  return NextResponse.json({ ok: true, articles: total, pending: pendingCount(), aiEnabled: aiReady() });
}
