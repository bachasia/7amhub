import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { articles, sources } from "@/lib/db/schema";
import { serializeArticle } from "@/lib/serialize";
import { extractFullText } from "@/lib/ingest/extract";
import { catLabel } from "@/lib/categories";
import { Sparkles, ExternalLink, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

async function getArticle(id: string) {
  const a = db.select().from(articles).where(eq(articles.id, id)).get();
  if (!a) return null;

  let blocks: { t: "p" | "img"; v: string }[] = [];
  if (a.content) {
    try { blocks = JSON.parse(a.content); } catch { blocks = []; }
  }
  if (!blocks.length) {
    const ex = await extractFullText(a.url);
    if (ex) {
      blocks = ex.blocks;
      db.update(articles)
        .set({ fullText: ex.text, content: JSON.stringify(ex.blocks), ...(!a.image && ex.image ? { image: ex.image } : {}) })
        .where(eq(articles.id, id))
        .run();
    }
  }

  const src = db.select().from(sources).where(eq(sources.id, a.sourceId)).get() ?? undefined;
  return { ...serializeArticle(a, src), content: blocks };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) return { title: "Không tìm thấy bài viết" };

  return {
    title: `${article.title} — 7AM Hub`,
    description: article.lead || article.summary || undefined,
    openGraph: {
      title: article.title,
      description: article.lead || article.summary || undefined,
      ...(article.img ? { images: [{ url: article.img }] } : {}),
      type: "article",
    },
    twitter: {
      card: article.img ? "summary_large_image" : "summary",
      title: article.title,
      description: article.lead || article.summary || undefined,
      ...(article.img ? { images: [article.img] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) notFound();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
      {/* Back link */}
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13.5,
          fontWeight: 600,
          color: "var(--muted-foreground)",
          textDecoration: "none",
          marginBottom: 24,
        }}
      >
        <ArrowLeft size={15} />
        7AM Hub
      </Link>

      {/* Category + source */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted-foreground)", marginBottom: 14 }}>
        {article.cat && (
          <span style={{ fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: ".06em", fontSize: 11 }}>
            {catLabel(article.cat)}
          </span>
        )}
        {article.cat && <span>·</span>}
        <span>{article.source}</span>
        <span>·</span>
        <span>{article.time}</span>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: "clamp(24px, 5vw, 36px)",
          lineHeight: 1.18,
          letterSpacing: "-.02em",
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          marginBottom: 24,
        }}
      >
        {article.title}
      </h1>

      {/* Hero image */}
      {article.img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.img}
          alt=""
          style={{
            width: "100%",
            aspectRatio: "16/9",
            objectFit: "cover",
            borderRadius: 12,
            border: "1px solid var(--border)",
            marginBottom: 28,
            display: "block",
          }}
        />
      )}

      {/* AI summary */}
      {(article.lead || article.points.length > 0) && (
        <div
          style={{
            background: "color-mix(in oklab, var(--primary) 6%, var(--card))",
            border: "1px solid color-mix(in oklab, var(--primary) 20%, transparent)",
            borderRadius: 12,
            padding: "18px 20px",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 600, color: "var(--primary)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 12 }}>
            <Sparkles size={12} />
            Tóm tắt bởi AI · Claude Haiku
          </div>
          {article.lead && (
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--foreground)", margin: 0 }}>{article.lead}</p>
          )}
          {article.points.length > 0 && (
            <ul style={{ margin: "14px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {article.points.map((pt, i) => (
                <li key={i} style={{ fontSize: 15.5, lineHeight: 1.7, color: "var(--foreground)" }}>{pt}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Article content */}
      {article.content.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted-foreground)", marginBottom: 16, opacity: .7 }}>
            Nội dung bài gốc
          </div>
          {article.content.map((block, i) =>
            block.t === "p" ? (
              <p key={i} style={{ fontSize: 16, lineHeight: 1.75, color: "var(--foreground)", marginBottom: 16 }}>
                {block.v}
              </p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={block.v}
                alt=""
                style={{ display: "block", width: "100%", height: "auto", borderRadius: 10, margin: "6px 0 18px", border: "1px solid var(--border)" }}
              />
            )
          )}
        </div>
      )}

      {/* CTA */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--primary)",
            color: "#faf9f5",
            fontWeight: 600,
            fontSize: 13,
            padding: "10px 20px",
            borderRadius: 9999,
            textDecoration: "none",
            letterSpacing: ".05em",
            textTransform: "uppercase",
          }}
        >
          <ExternalLink size={15} />
          Đọc bài gốc tại {article.source}
        </a>
      </div>
    </main>
  );
}
