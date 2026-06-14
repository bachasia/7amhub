export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prepareChatContext, chatStream } from "@/lib/ai/chat";
import { todayLocal } from "@/lib/local-date";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question = (body?.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  let ctx: ReturnType<typeof prepareChatContext>;
  try {
    const date = body?.date ?? todayLocal();
    ctx = prepareChatContext(date);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "RATE_LIMIT") return NextResponse.json({ error: "daily limit reached" }, { status: 429 });
    if (msg === "AI_NOT_READY") return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
    return NextResponse.json({ error: "chat failed" }, { status: 500 });
  }

  // Stream plain-text answer; append JSON sources map as last line after SOURCES marker
  const sourceMap = Object.fromEntries(ctx.rows.map((r) => [r.id, { title: r.title, url: r.url }]));
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chatStream(question, ctx.context)) {
          controller.enqueue(encoder.encode(chunk));
        }
        // Append source map so client can hydrate links without extra API calls
        controller.enqueue(encoder.encode(`\nSOURCE_MAP:${JSON.stringify(sourceMap)}`));
      } catch {
        controller.enqueue(encoder.encode("\nSOURCES: none"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
