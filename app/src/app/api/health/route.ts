export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { articles, settings } from "@/lib/db/schema";
import { pendingCount } from "@/lib/jobs/ai-worker";
import { aiReady } from "@/lib/ai/client";
import { HEARTBEAT_KEY, STALE_MS } from "@/lib/jobs/worker-heartbeat";

export function GET() {
  const total = db.select({ n: sql<number>`count(*)` }).from(articles).get()?.n ?? 0;

  const hb = db.select().from(settings).where(eq(settings.key, HEARTBEAT_KEY)).get();
  const workerLastSeen = hb?.updatedAt ?? null;
  const workerAlive = workerLastSeen !== null && (Date.now() - workerLastSeen) < STALE_MS;

  return NextResponse.json({
    ok: true,
    articles: total,
    pending: pendingCount(),
    aiEnabled: aiReady(),
    workerAlive,
    workerLastSeen,
  });
}
