export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { articles, sources } from "@/lib/db/schema";
import { serializeArticle } from "@/lib/serialize";
import { extractFullText } from "@/lib/ingest/extract";
import { aiReady } from "@/lib/ai/client";
import { translateContent } from "@/lib/ai/translate-content";

type Block = { t: "p" | "img"; v: string };

// Heuristic: nếu >2% ký tự là diacritics tiếng Việt thì skip translation
function isVietnamese(paragraphs: string[]): boolean {
  const text = paragraphs.join(" ");
  if (!text) return false;
  const viMatches = text.match(/[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắặằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỷỹỵÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯ]/g);
  return (viMatches?.length ?? 0) / text.length > 0.02;
}

// Article IDs are full URLs (e.g. "https://vnexpress.net/...") so they span multiple
// path segments when used in a route. The catch-all [...id] captures them all and rejoins.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string[] }> }) {
  const { id } = await params;
  const articleId = id.join("/");
  const a = db.select().from(articles).where(eq(articles.id, articleId)).get();
  if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });

  let blocks: Block[] = [];
  if (a.content) {
    try { blocks = JSON.parse(a.content); } catch { blocks = []; }
  }
  if (!blocks.length) {
    const ex = await extractFullText(a.url);
    if (ex) {
      blocks = ex.blocks;
      db.update(articles)
        .set({
          fullText: ex.text,
          content: JSON.stringify(ex.blocks),
          ...(!a.image && ex.image ? { image: ex.image } : {}),
        })
        .where(eq(articles.id, articleId))
        .run();
    }
  }

  // Dịch nội dung on-demand, cache vào ai_content_vi
  let contentVi: Block[] = [];
  if (a.aiContentVi) {
    try { contentVi = JSON.parse(a.aiContentVi); } catch { contentVi = []; }
  }
  if (!contentVi.length && aiReady()) {
    const paragraphs = blocks.filter((b) => b.t === "p").map((b) => b.v);
    if (paragraphs.length) {
      if (isVietnamese(paragraphs)) {
        // Nội dung đã tiếng Việt — không cần dịch
        contentVi = blocks;
      } else {
        try {
          const translated = await translateContent(paragraphs);
          // Ghép lại: giữ img block ở vị trí gốc, thay p block bằng bản dịch
          let pIdx = 0;
          contentVi = blocks.map((b) => b.t === "img" ? b : { t: "p" as const, v: translated[pIdx++] ?? b.v });
          db.update(articles)
            .set({ aiContentVi: JSON.stringify(contentVi) })
            .where(eq(articles.id, articleId))
            .run();
        } catch (e) {
          console.error("[translate] failed for", articleId, e instanceof Error ? e.message : e);
          contentVi = [];
        }
      }
    }
  }

  const src = db.select().from(sources).where(eq(sources.id, a.sourceId)).get() ?? undefined;
  return NextResponse.json({
    ...serializeArticle(a, src),
    content: contentVi.length ? contentVi : blocks,
  });
}
