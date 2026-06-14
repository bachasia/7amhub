"use client";
import type { DigestData } from "@/hooks/use-digest";
import type { ApiArticle } from "@/lib/serialize";
import { ArticleRow } from "./article-row";
import type { ApiSource } from "@/hooks/use-sources";
import { catLabel } from "@/lib/categories";
import { Sparkles } from "lucide-react";

interface DigestViewProps {
  digest: DigestData | null;
  loading: boolean;
  sources: ApiSource[];
  readIds: Set<string>;
  savedIds: Set<string>;
  onOpen: (article: ApiArticle) => void;
  onSave: (article: ApiArticle) => void;
}

export function DigestView({ digest, loading, sources, readIds, savedIds, onOpen, onSave }: DigestViewProps) {
  const srcMap = new Map(sources.map((s) => [s.id, s]));

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
        Đang tải bản tin…
      </div>
    );
  }

  if (!digest || !digest.hasDigest) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
        Chưa có bản tin hôm nay. Bản tin 7AM sẽ tự động tạo lúc 07:00 sáng.
      </div>
    );
  }

  const renderRow = (a: ApiArticle) => (
    <ArticleRow
      key={a.id}
      article={a}
      source={srcMap.get(a.sourceId)}
      read={readIds.has(a.id)}
      saved={savedIds.has(a.id)}
      onOpen={onOpen}
      onSave={onSave}
    />
  );

  return (
    <div>
      {/* AI badge + intro */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontSize: 10,
          fontWeight: 600,
          color: "var(--primary)",
          background: "color-mix(in oklab, var(--primary) 10%, var(--card))",
          padding: "4px 10px",
          borderRadius: 9999,
          marginBottom: 14,
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}>
          <Sparkles size={12} />
          Đề xuất AI · {digest.date}
        </div>
        {digest.intro && (
          <p style={{ fontSize: 15.5, lineHeight: 1.7, color: "var(--foreground)" }}>{digest.intro}</p>
        )}
      </div>

      {/* Picks */}
      {digest.picks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 8, opacity: .7 }}>
            Tin nổi bật hôm nay
          </div>
          {digest.picks.map(renderRow)}
        </div>
      )}

      {/* By category */}
      {digest.byCat.map((group) => (
        <div key={group.cat} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 8, opacity: .7 }}>
            {catLabel(group.cat)}
          </div>
          {group.items.map(renderRow)}
        </div>
      ))}
    </div>
  );
}
