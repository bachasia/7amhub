"use client";
import { Sparkles, ExternalLink, Bookmark } from "lucide-react";
import type { ApiArticle } from "@/lib/serialize";
import { catLabel } from "@/lib/categories";
import { ImageIcon } from "lucide-react";

const CAT_BG: Record<string, string> = {
  tech: "#c96442",
  science: "#2d7a5a",
  news: "#b53333",
  biz: "#a05c20",
  world: "#6b4f3a",
};
const CAT_PILL: Record<string, string> = {
  tech: "#d97757",
  science: "#4a9a7a",
  news: "#c94444",
  biz: "#c47a3a",
  world: "#8b6b55",
};

interface ArticleCardProps {
  article: ApiArticle;
  saved: boolean;
  onOpen: (article: ApiArticle) => void;
  onSave: (article: ApiArticle) => void;
}

export function ArticleCard({ article, saved, onOpen, onSave }: ArticleCardProps) {
  const bg = CAT_BG[article.cat ?? ""] ?? "#5e5d59";
  const pill = CAT_PILL[article.cat ?? ""] ?? "#87867f";

  return (
    <div
      data-cat={article.cat ?? ""}
      style={{
        height: "100%",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        display: "flex",
        flexDirection: "column",
        padding: 12,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRadius: 22,
          overflow: "hidden",
          background: "var(--card)",
          boxShadow: "0 0 0 1px var(--border), 0 4px 24px rgba(0,0,0,.06)",
          cursor: "pointer",
        }}
        onClick={() => onOpen(article)}
      >
        {/* Image */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {article.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.img}
              alt=""
              style={{ width: "100%", aspectRatio: "5/3", objectFit: "cover", display: "block" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                aspectRatio: "5/3",
                display: "grid",
                placeItems: "center",
                background: "repeating-linear-gradient(45deg, color-mix(in srgb, var(--foreground) 5%, var(--card)) 0 14px, color-mix(in srgb, var(--foreground) 9%, var(--card)) 14px 28px)",
              }}
            >
              <ImageIcon size={46} style={{ color: "color-mix(in srgb, var(--foreground) 26%, transparent)" }} />
            </div>
          )}

          {/* Category pill */}
          {article.cat && (
            <span style={{
              position: "absolute",
              top: 14,
              left: 14,
              padding: "6px 13px",
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              background: pill,
              letterSpacing: ".01em",
              boxShadow: "0 2px 10px rgba(0,0,0,.25)",
            }}>
              {catLabel(article.cat)}
            </span>
          )}

          {/* Bookmark button */}
          <button
            onClick={(e) => { e.stopPropagation(); onSave(article); }}
            aria-label={saved ? "Bỏ lưu" : "Lưu bài"}
            style={{
              position: "absolute",
              top: 11,
              right: 11,
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "rgba(12,14,19,.42)",
              display: "grid",
              placeItems: "center",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Bookmark
              size={22}
              fill={saved ? "#d4a84b" : "none"}
              color={saved ? "#d4a84b" : "#fff"}
            />
          </button>
        </div>

        {/* Body — colored by category */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "22px 22px 20px",
            color: "#fff",
            minHeight: 0,
            background: bg,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(22px, 6.2vw, 30px)",
              lineHeight: 1.16,
              fontWeight: 600,
              letterSpacing: "-.01em",
              textWrap: "balance",
              margin: 0,
            }}
          >
            {article.title}
          </h2>

          {/* AI summary — scrollable area */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", marginTop: 14, paddingBottom: 16, scrollbarWidth: "none" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".04em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,.92)",
              background: "rgba(255,255,255,.18)",
              padding: "4px 10px",
              borderRadius: 9999,
              marginBottom: 11,
            }}>
              <Sparkles size={12} />
              Tóm tắt AI
            </div>

            {(article.lead || article.summary) && (
              <p style={{ fontSize: "clamp(14.5px, 4vw, 16.5px)", lineHeight: 1.52, color: "rgba(255,255,255,.92)", textWrap: "pretty" }}>
                {article.lead || article.summary}
              </p>
            )}

            {article.points.length > 0 && (
              <ul style={{ margin: "13px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                {article.points.map((pt, i) => (
                  <li key={i} style={{ fontSize: "clamp(14.5px, 4vw, 16.5px)", lineHeight: 1.52, color: "rgba(255,255,255,.92)" }}>{pt}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Card footer */}
          <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", alignItems: "center", gap: 12, flexShrink: 0, borderTop: "1px solid rgba(255,255,255,.18)" }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,.78)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {article.source} · {article.time}
            </span>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "8px 14px",
                borderRadius: 9999,
                background: "rgba(255,255,255,.16)",
                color: "#fff",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <ExternalLink size={15} />
              Đọc
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
