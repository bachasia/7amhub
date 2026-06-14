"use client";
import { useState } from "react";
import type { DigestData, DigestCluster } from "@/hooks/use-digest";
import type { ApiArticle } from "@/lib/serialize";
import { ArticleRow } from "./article-row";
import type { ApiSource } from "@/hooks/use-sources";
import { catLabel } from "@/lib/categories";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface DigestViewProps {
  digest: DigestData | null;
  loading: boolean;
  sources: ApiSource[];
  readIds: Set<string>;
  savedIds: Set<string>;
  onOpen: (article: ApiArticle) => void;
  onSave: (article: ApiArticle) => void;
}

type DigestTab = "category" | "events";

function ClusterCard({ cluster, readIds, savedIds, srcMap, onOpen, onSave }: {
  cluster: DigestCluster;
  readIds: Set<string>;
  savedIds: Set<string>;
  srcMap: Map<string, ApiSource>;
  onOpen: (article: ApiArticle) => void;
  onSave: (article: ApiArticle) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: "var(--card)",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, fontFamily: "var(--font-display)", lineHeight: 1.35 }}>
          {cluster.event}
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--primary)",
          background: "color-mix(in oklab, var(--primary) 10%, var(--card))",
          padding: "2px 8px",
          borderRadius: 9999,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {cluster.sources.length} nguồn
        </span>
        {expanded ? <ChevronUp size={15} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} /> : <ChevronDown size={15} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
      </button>
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {cluster.articles.map((a) => (
            <ArticleRow
              key={a.id}
              article={a}
              source={srcMap.get(a.sourceId)}
              read={readIds.has(a.id)}
              saved={savedIds.has(a.id)}
              onOpen={onOpen}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DigestView({ digest, loading, sources, readIds, savedIds, onOpen, onSave }: DigestViewProps) {
  const [digestTab, setDigestTab] = useState<DigestTab>("category");
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

  const hasClusters = digest.clusters.length > 0;
  const subTabStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 12px",
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    background: active ? "color-mix(in oklab, var(--primary) 12%, var(--card))" : "transparent",
    border: active ? "1px solid color-mix(in oklab, var(--primary) 35%, transparent)" : "1px solid var(--border)",
    color: active ? "var(--primary)" : "var(--muted-foreground)",
    cursor: "pointer",
    textTransform: "uppercase" as const,
    letterSpacing: ".05em",
  });

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

      {/* Sub-tabs: Theo danh mục / Theo sự kiện */}
      {hasClusters && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <button style={subTabStyle(digestTab === "category")} onClick={() => setDigestTab("category")}>
            Theo danh mục
          </button>
          <button style={subTabStyle(digestTab === "events")} onClick={() => setDigestTab("events")}>
            Theo sự kiện
          </button>
        </div>
      )}

      {/* By category */}
      {digestTab === "category" && digest.byCat.map((group) => (
        <div key={group.cat} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 8, opacity: .7 }}>
            {catLabel(group.cat)}
          </div>
          {group.items.map(renderRow)}
        </div>
      ))}

      {/* By events */}
      {digestTab === "events" && hasClusters && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12, opacity: .7 }}>
            Sự kiện hôm nay
          </div>
          {digest.clusters.map((c, i) => (
            <ClusterCard
              key={i}
              cluster={c}
              readIds={readIds}
              savedIds={savedIds}
              srcMap={srcMap}
              onOpen={onOpen}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
