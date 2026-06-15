"use client";
import { useState, useEffect, useCallback } from "react";
import type { TrendingTopic } from "@/hooks/use-trending";
import type { ApiArticle } from "@/lib/serialize";
import { catColor, catLabel } from "@/lib/categories";
import { ImageIcon } from "lucide-react";

const SLIDE_INTERVAL = 5000;

interface TrendingPanelProps {
  topics: TrendingTopic[];
  featured: ApiArticle[];
  activeTopic: string | null;
  onTopicSelect: (tag: string | null) => void;
  onArticleOpen: (article: ApiArticle) => void;
}

export function TrendingPanel({ topics, featured, activeTopic, onTopicSelect, onArticleOpen }: TrendingPanelProps) {
  const maxCount = topics[0]?.count ?? 1;
  const [idx, setIdx] = useState(0);

  const goTo = useCallback((i: number) => setIdx(i), []);

  // Auto-advance carousel
  useEffect(() => {
    if (featured.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % featured.length), SLIDE_INTERVAL);
    return () => clearInterval(t);
  }, [featured.length]);

  // Reset when picks change
  useEffect(() => { setIdx(0); }, [featured]);

  const current = featured[idx] ?? null;

  return (
    <aside
      style={{
        height: "100%",
        background: "var(--card)",
        borderLeft: "1px solid var(--border)",
        padding: "20px 18px",
        overflowY: "auto",
        minHeight: 0,
        scrollbarWidth: "thin",
        boxSizing: "border-box",
      }}
    >
      {/* Featured carousel */}
      {current && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12, opacity: 0.7 }}>
            Bản tin nổi bật
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 12,
              cursor: "pointer",
              transition: "box-shadow .2s, border-color .2s",
            }}
            role="button"
            tabIndex={0}
            onClick={() => onArticleOpen(current)}
            onKeyDown={(e) => e.key === "Enter" && onArticleOpen(current)}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,.07)"; e.currentTarget.style.borderColor = "transparent"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            {/* Slide image with crossfade */}
            <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
              {featured.map((a, i) => (
                a.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={a.id}
                    src={a.img}
                    alt=""
                    style={{
                      position: "absolute", inset: 0,
                      width: "100%", height: "100%", objectFit: "cover",
                      opacity: i === idx ? 1 : 0,
                      transition: "opacity .5s ease",
                    }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <div
                    key={a.id}
                    style={{
                      position: "absolute", inset: 0,
                      display: i === idx ? "grid" : "none",
                      placeItems: "center",
                      background: "repeating-linear-gradient(45deg, color-mix(in srgb, var(--foreground) 4%, var(--card)) 0 14px, color-mix(in srgb, var(--foreground) 8%, var(--card)) 14px 28px)",
                    }}
                  >
                    <ImageIcon size={38} style={{ color: "color-mix(in srgb, var(--foreground) 20%, transparent)" }} />
                  </div>
                )
              ))}
            </div>

            {/* Text content */}
            <div style={{ padding: "14px 15px 16px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: 7, color: catColor(current.cat) }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: catColor(current.cat), flexShrink: 0 }} />
                {catLabel(current.cat)}
              </div>
              <h3 style={{ fontSize: 15.5, lineHeight: 1.38, letterSpacing: "-.01em", fontFamily: "var(--font-display)", fontWeight: 500, margin: 0, minHeight: 44 }}>
                {current.viTitle || current.title}
              </h3>
              {current.summary && (
                <p style={{
                  fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.62, marginTop: 7,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {current.summary}
                </p>
              )}
            </div>
          </div>

          {/* Dot nav */}
          {featured.length > 1 && (
            <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 20 }}>
              {featured.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Tin ${i + 1}`}
                  style={{
                    width: i === idx ? 18 : 6,
                    height: 6,
                    borderRadius: 4,
                    background: i === idx ? "var(--primary)" : "color-mix(in oklab, var(--primary) 28%, transparent)",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "width .25s, background .25s",
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Trending topics */}
      {topics.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12, display: "flex", alignItems: "center", gap: 7, opacity: 0.7 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", opacity: .55 }} />
            Chủ đề nổi bật
          </div>
          {topics.map((t) => {
            const active = activeTopic === t.tag;
            return (
              <div
                key={t.tag}
                role="button"
                tabIndex={0}
                onClick={() => onTopicSelect(active ? null : t.tag)}
                onKeyDown={(e) => e.key === "Enter" && onTopicSelect(active ? null : t.tag)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 8px",
                  margin: "0 -4px",
                  borderRadius: 9,
                  cursor: "pointer",
                  transition: ".15s",
                  background: active
                    ? "color-mix(in oklab, var(--primary) 12%, var(--card))"
                    : "transparent",
                  boxShadow: active ? "inset 0 0 0 1px color-mix(in oklab, var(--primary) 35%, transparent)" : "none",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--muted)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, flex: 1, color: active ? "var(--primary)" : "var(--foreground)" }}>
                  {t.tag}
                </span>
                <span
                  style={{
                    height: 4,
                    borderRadius: 4,
                    background: "color-mix(in oklab, var(--primary) 28%, transparent)",
                    width: Math.max(4, Math.round((t.count / maxCount) * 60)),
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", minWidth: 20, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {t.count}
                </span>
              </div>
            );
          })}
        </>
      )}
    </aside>
  );
}
