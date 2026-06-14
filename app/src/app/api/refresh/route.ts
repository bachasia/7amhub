export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runIngestOnce } from "@/lib/jobs/ingest-job";
import { processPending } from "@/lib/jobs/ai-worker";

export async function POST() {
  await runIngestOnce();
  const ai = await processPending(20);
  return NextResponse.json({ ok: true, processed: ai });
}
