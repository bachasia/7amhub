export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runDigestOnce } from "@/lib/jobs/digest-job";

export async function POST() {
  await runDigestOnce();
  return NextResponse.json({ ok: true });
}
