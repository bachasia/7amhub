export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import Parser from "rss-parser";
import { db } from "@/lib/db/client";
import { sources, articles } from "@/lib/db/schema";
import { callJSON, aiReady } from "@/lib/ai/client";
import { config } from "@/lib/config";

const probe = new Parser({ timeout: 12000, headers: { "User-Agent": "Mozilla/5.0 (compatible; 7AMHubBot/1.0)" } });

const bodySchema = z.object({
  label: z.string().trim().min(1),
  url: z.string().trim().min(1),
});

function normalizeUrl(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function urlSlug(url: string): string {
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    return seg.replace(/\.(rss|xml|atom)$/i, "");
  } catch { return ""; }
}

function baseLabel(label: string): string {
  const sep = label.indexOf(" · ");
  return sep >= 0 ? label.slice(0, sep) : label;
}

/** Generate sublabels cho tất cả sources trong 1 group có cùng base label. */
async function generateSublabels(group: { id: string; url: string }[]): Promise<Map<string, string>> {
  if (!aiReady()) return new Map();
  const items = group.map((s) => ({ id: s.id, slug: urlSlug(s.url) })).filter((x) => x.slug);
  if (items.length === 0) return new Map();
  try {
    const result = await callJSON({
      model: config.MODEL_FAST,
      system: "Bạn là trợ lý chuyển slug URL tiếng Việt thành tên hiển thị ngắn gọn, đúng dấu, viết hoa chữ đầu.",
      user: `Chuyển các slug sau thành tên hiển thị tiếng Việt (ngắn, có dấu, ví dụ "the-gioi" → "Thế giới"):\n${items.map((x) => `id="${x.id}" slug="${x.slug}"`).join("\n")}`,
      toolName: "return_labels",
      toolDescription: "Trả danh sách {id, sublabel} cho từng slug",
      inputSchema: {
        type: "object",
        properties: {
          labels: {
            type: "array",
            items: { type: "object", properties: { id: { type: "string" }, sublabel: { type: "string" } }, required: ["id", "sublabel"] },
          },
        },
        required: ["labels"],
      },
      validator: z.object({ labels: z.array(z.object({ id: z.string(), sublabel: z.string() })) }),
      maxTokens: 256,
      retries: 1,
    });
    return new Map(result.labels.map((x) => [x.id, x.sublabel]));
  } catch { return new Map(); }
}

export function GET() {
  const counts = new Map(
    db
      .select({ sid: articles.sourceId, n: sql<number>`count(*)` })
      .from(articles)
      .where(eq(articles.aiStatus, "ready"))
      .groupBy(articles.sourceId)
      .all()
      .map((r) => [r.sid, r.n])
  );
  const rows = db.select().from(sources).all();
  return NextResponse.json(rows.map((s) => ({ ...s, active: !!s.active, count: counts.get(s.id) ?? 0 })));
}

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Cần nhập tên nguồn và URL RSS." }, { status: 400 });
  const url = normalizeUrl(parsed.data.url);

  let siteUrl: string | null = null;
  try {
    const feed = await probe.parseURL(url);
    siteUrl = feed.link || null;
  } catch {
    return NextResponse.json({ error: "Không đọc được RSS từ URL này." }, { status: 400 });
  }

  const existing = db.select().from(sources).where(eq(sources.url, url)).get();
  if (existing) return NextResponse.json({ error: "Nguồn đã tồn tại." }, { status: 409 });

  const newId = "f" + Date.now();
  const row = { id: newId, label: parsed.data.label, url, siteUrl, active: 1, createdAt: Date.now() };
  db.insert(sources).values(row).run();

  // Kiểm tra xem có sources khác cùng base label không → generate sublabels 1 lần
  const base = baseLabel(parsed.data.label);
  const allSources = db.select().from(sources).all();
  const group = allSources.filter((s) => baseLabel(s.label) === base);
  if (group.length > 1) {
    const needsLabel = group.filter((s) => !s.sublabel);
    if (needsLabel.length > 0) {
      const sublabelMap = await generateSublabels(group.map((s) => ({ id: s.id, url: s.url })));
      for (const [id, sublabel] of sublabelMap) {
        db.update(sources).set({ sublabel }).where(eq(sources.id, id)).run();
      }
    }
  }

  const saved = db.select().from(sources).where(eq(sources.id, newId)).get();
  return NextResponse.json({ ...saved, active: true, count: 0 }, { status: 201 });
}
