export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { chatWithNews } from "@/lib/ai/chat";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question = (body?.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  try {
    const result = await chatWithNews(question, body?.date);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg === "RATE_LIMIT") return NextResponse.json({ error: "daily limit reached" }, { status: 429 });
    if (msg === "AI_NOT_READY") return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
    return NextResponse.json({ error: "chat failed" }, { status: 500 });
  }
}
