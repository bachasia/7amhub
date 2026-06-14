"use client";
import { useEffect, useState, useCallback } from "react";
import type { ApiArticle } from "@/lib/serialize";
import { SourceFavicon } from "./source-favicon";
import type { ApiSource } from "@/hooks/use-sources";
import { SaveButton } from "./save-button";
import { X, Sparkles, ExternalLink } from "lucide-react";

interface ContentBlock { t: "p" | "img"; v: string }
interface ArticleDetail extends ApiArticle {
  content: ContentBlock[];
}

interface ReaderModalProps {
  article: ApiArticle | null;
  source?: ApiSource;
  savedIds: Set<string>;
  onSave: (article: ApiArticle) => void;
  onClose: () => void;
  onMarkRead: (id: string) => void;
}

export function ReaderModal({ article, source, savedIds, onSave, onClose, onMarkRead }: ReaderModalProps) {
  const [tab, setTab] = useState<"ai" | "original">("ai");
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const open = article !== null;

  // Mark as read and load detail when opened
  useEffect(() => {
    if (!article) { setDetail(null); return; }
    setTab("ai");
    onMarkRead(article.id);
  }, [article, onMarkRead]);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(id)}`);
      if (res.ok) setDetail(await res.json());
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "original" && article && !detail) {
      loadDetail(article.id);
    }
  }, [tab, article, detail, loadDetail]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!article) return null;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 16px",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    color: active ? "#faf9f5" : "var(--muted-foreground)",
    textTransform: "uppercase",
    letterSpacing: ".06em",
    background: active ? "var(--primary)" : "transparent",
    border: "none",
    cursor: "pointer",
  });

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,.35)",
          zIndex: 70,
        }}
      />

      {/* Modal */}
      <section
        style={{
          position: "fixed",
          zIndex: 80,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(680px, 93vw)",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "0 20px 52px rgba(0,0,0,.15)",
          scrollbarWidth: "thin",
        }}
      >
        <div style={{ padding: "22px 26px 26px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
            <SourceFavicon siteUrl={source?.siteUrl ?? null} label={article.source} size={18} />
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>{article.source}</span>
            <span style={{ color: "var(--muted-foreground)" }}>·</span>
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{article.time}</span>
            <button
              onClick={onClose}
              aria-label="Đóng"
              style={{
                marginLeft: "auto",
                width: 34,
                height: 34,
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                color: "var(--muted-foreground)",
                background: "none",
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <X size={18} />
            </button>
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: 24,
              fontWeight: 500,
              lineHeight: 1.2,
              letterSpacing: "-.01em",
              fontFamily: "var(--font-display)",
              marginBottom: 16,
              margin: "0 0 16px",
            }}
          >
            {article.title}
          </h2>

          {/* Thumbnail */}
          {article.img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.img}
              alt=""
              style={{
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: 6,
                objectFit: "cover",
                background: "var(--muted)",
                marginBottom: 18,
                border: "1px solid var(--border)",
                display: "block",
              }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}

          {/* Tabs */}
          <div
            style={{
              display: "inline-flex",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 3,
              marginBottom: 18,
            }}
          >
            <button style={tabStyle(tab === "ai")} onClick={() => setTab("ai")}>✦ Tóm tắt AI</button>
            <button style={tabStyle(tab === "original")} onClick={() => setTab("original")}>Bài gốc</button>
          </div>

          {/* AI summary pane */}
          {tab === "ai" && (
            <div>
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
                Tóm tắt bởi AI
                <span style={{ fontWeight: 400, color: "var(--muted-foreground)", marginLeft: 4 }}>· Claude Haiku</span>
              </div>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--foreground)" }}>{article.lead || article.summary}</p>
              {article.points.length > 0 && (
                <ul style={{ margin: "16px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 9 }}>
                  {article.points.map((pt, i) => (
                    <li key={i} style={{ fontSize: 16, lineHeight: 1.7, color: "var(--foreground)" }}>{pt}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Original article pane */}
          {tab === "original" && (
            <div>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.65, marginBottom: 18 }}>
                Nội dung bên dưới được trích xuất tự động. Để đọc đầy đủ, hãy mở bài gốc.
              </p>
              {loadingDetail ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "46px 0", color: "var(--muted-foreground)", fontSize: 13.5 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
                  Đang tải nội dung…
                </div>
              ) : detail?.content?.length ? (
                <div>
                  {detail.content.map((block, i) =>
                    block.t === "p" ? (
                      <p key={i} style={{ fontSize: 15.5, lineHeight: 1.75, color: "var(--foreground)", marginBottom: 14 }}>
                        {block.v}
                      </p>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={block.v}
                        alt=""
                        style={{ display: "block", width: "100%", height: "auto", borderRadius: 10, margin: "6px 0 18px", border: "1px solid var(--border)" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )
                  )}
                </div>
              ) : (
                <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Không trích xuất được nội dung. Hãy đọc bài gốc.</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
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
                fontSize: 12,
                padding: "9px 18px",
                borderRadius: 9999,
                textDecoration: "none",
                letterSpacing: ".06em",
                textTransform: "uppercase",
                transition: ".15s",
              }}
            >
              <ExternalLink size={15} />
              Mở bài gốc
            </a>
            <SaveButton article={article} saved={savedIds.has(article.id)} onToggle={onSave} />
          </div>
        </div>
      </section>

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
