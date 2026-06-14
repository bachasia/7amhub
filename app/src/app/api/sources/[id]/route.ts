export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sources } from "@/lib/db/schema";

const bodySchema = z.object({
  label: z.string().trim().min(1).optional(),
  url: z.string().trim().min(1).optional(),
});

function normalizeUrl(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  const s = db.select().from(sources).where(eq(sources.id, id)).get();
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });

  const next = {
    label: parsed.data.label ?? s.label,
    url: parsed.data.url ? normalizeUrl(parsed.data.url) : s.url,
  };
  db.update(sources).set(next).where(eq(sources.id, id)).run();
  return NextResponse.json({ ...s, ...next });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.delete(sources).where(eq(sources.id, id)).run();
  return NextResponse.json({ ok: true });
}
