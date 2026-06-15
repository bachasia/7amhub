"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { ApiArticle } from "@/lib/serialize";
import { SourceFavicon } from "./source-favicon";
import type { ApiSource } from "@/hooks/use-sources";
import { SaveButton } from "./save-button";
import { X, Sparkles, ExternalLink } from "lucide-react";

interface ContentBlock { t: "p" | "img"; v: string }
interface ArticleDetail extends ApiArticle { content: ContentBlock[] }

interface ReaderModalProps {
  article: ApiArticle | null;
  source?: ApiSource;
  savedIds: Set<string>;
  onSave: (article: ApiArticle) => void;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  initialTab?: "ai" | "original";
}

export function ReaderModal({ article, source, savedIds, onSave, onClose, onMarkRead, initialTab = "ai" }: ReaderModalProps) {
  const [tab, setTab] = useState<"ai" | "original" | "video">(initialTab);
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [swipeDx, setSwipeDx] = useState(0);

  const modalRef = useRef<HTMLElement>(null);
  const swipeDxRef = useRef(0);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const open = article !== null;

  // Detect mobile breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Swipe-left-to-close (mobile only, non-passive to allow preventDefault)
  useEffect(() => {
    if (!isMobile || !open) return;
    const el = modalRef.current;
    if (!el) return;

    let startX = 0, startY = 0, isHoriz = false;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isHoriz = false;
      swipeDxRef.current = 0;
      setSwipeDx(0);
    };
    const onMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!isHoriz && (Math.abs(dx) + Math.abs(dy)) > 8)
        isHoriz = Math.abs(dx) > Math.abs(dy) && dx < 0;
      if (isHoriz) {
        e.preventDefault();
        const clamped = Math.min(0, dx);
        swipeDxRef.current = clamped;
        setSwipeDx(clamped);
      }
    };
    const onEnd = () => {
      if (swipeDxRef.current < -80) onCloseRef.current();
      else { swipeDxRef.current = 0; setSwipeDx(0); }
      isHoriz = false;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [isMobile, open]);

  // Reset on article change
  useEffect(() => {
    if (!article) { setDetail(null); return; }
    setTab(initialTab);
    setDetail(null);
    onMarkRead(article.id);
  }, [article, onMarkRead, initialTab]);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(id)}`);
      if (res.ok) setDetail(await res.json());
    } finally { setLoadingDetail(false); }
  }, []);

  useEffect(() => {
    if (tab === "original" && article && !detail && article.sourceType !== "youtube") loadDetail(article.id);
  }, [tab, article, detail, loadDetail]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!article) return null;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600,
    color: active ? "#faf9f5" : "var(--muted-foreground)",
    textTransform: "uppercase", letterSpacing: ".06em",
    background: active ? "var(--primary)" : "transparent",
    border: "none", cursor: "pointer",
  });

  // Trích video ID từ URL watch?v= cho YouTube article (dùng cho iframe embed).
  const videoId = article.sourceType === "youtube"
    ? (() => { try { return new URL(article.url).searchParams.get("v"); } catch { return null; } })()
    : null;

  // Shared inner content (header + body) — rendered once, used in both mobile/desktop shells
  const modalContent = (
    <>
      {/* Sticky header (mobile) / inline header (desktop) */}
      <div style={isMobile
        ? { position: "sticky", top: 0, zIndex: 1, background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 9 }
        : { display: "flex", alignItems: "center", gap: 9, padding: "22px 26px 0" }
      }>
        <SourceFavicon siteUrl={source?.siteUrl ?? null} label={article.source} size={18} />
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{article.source}</span>
        <span style={{ color: "var(--muted-foreground)" }}>·</span>
        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{article.time}</span>
        <button
          onClick={onClose} aria-label="Đóng"
          style={{ marginLeft: "auto", width: 34, height: 34, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: isMobile ? "18px 20px 40px" : "16px 26px 26px" }}>
        <h2 style={{ fontSize: isMobile ? 22 : 24, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-.01em", fontFamily: "var(--font-display)", margin: "0 0 16px" }}>
          {article.viTitle || article.title}
        </h2>

        {article.img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.img} alt=""
            style={{ width: "100%", aspectRatio: "16/9", borderRadius: 6, objectFit: "cover", background: "var(--muted)", marginBottom: 18, border: "1px solid var(--border)", display: "block" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}

        <div style={{ display: "inline-flex", background: "transparent", border: "1px solid var(--border)", borderRadius: 10, padding: 3, marginBottom: 18 }}>
          <button style={tabStyle(tab === "ai")} onClick={() => setTab("ai")}>✦ Tóm tắt AI</button>
          {article.sourceType === "youtube"
            ? <button style={tabStyle(tab === "video")} onClick={() => setTab("video")}>▶ Xem video</button>
            : <button style={tabStyle(tab === "original")} onClick={() => setTab("original")}>Nội dung</button>
          }
        </div>

        {tab === "ai" && (
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 600, color: "var(--primary)", background: "color-mix(in oklab, var(--primary) 10%, var(--card))", padding: "4px 10px", borderRadius: 9999, marginBottom: 14, letterSpacing: ".08em", textTransform: "uppercase" }}>
              <Sparkles size={12} />
              Tóm tắt bởi AI
              <span style={{ fontWeight: 400, color: "var(--muted-foreground)", marginLeft: 4 }}>· Claude Haiku</span>
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--foreground)" }}>{article.lead || article.summary}</p>
            {article.points.length > 0 && (
              <ul style={{ margin: "16px 0 0", paddingLeft: 0, display: "flex", flexDirection: "column", gap: 10, listStyle: "none" }}>
                {article.points.map((pt, i) => (
                  <li key={i} style={{ fontSize: 15.5, lineHeight: 1.7, color: "var(--foreground)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", flexShrink: 0, marginTop: 9 }} />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "video" && (videoId ? (
          <div style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "16/9", background: "#000" }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?rel=0`}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={article.viTitle || article.title}
            />
          </div>
        ) : (
          <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Không nhúng được video. Hãy mở trên YouTube.</p>
        ))}

        {tab === "original" && (
          <div>
            {loadingDetail ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "46px 0", color: "var(--muted-foreground)", fontSize: 13.5 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
                Đang tải nội dung…
              </div>
            ) : detail?.content?.length ? (
              <div>
                {detail.content.map((block, i) =>
                  block.t === "p" ? (
                    <p key={i} style={{ fontSize: 15.5, lineHeight: 1.75, color: "var(--foreground)", marginBottom: 14 }}>{block.v}</p>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={block.v} alt=""
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

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <a href={article.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--primary)", color: "#faf9f5", fontWeight: 600, fontSize: 12, padding: "9px 18px", borderRadius: 9999, textDecoration: "none", letterSpacing: ".06em", textTransform: "uppercase", transition: ".15s" }}
          >
            <ExternalLink size={15} />
            Mở bài gốc
          </a>
          <SaveButton article={article} saved={savedIds.has(article.id)} onToggle={onSave} />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Scrim — desktop only */}
      {!isMobile && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", zIndex: 70 }} />
      )}

      {isMobile ? (
        /**
         * Mobile two-layer shell:
         *   outer div  — zoom-in entrance animation (scale transform)
         *   inner section — swipe-left-to-close (translateX transform)
         * Separating them avoids transform conflicts between animation and swipe.
         */
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          animation: "modal-zoom-in .3s cubic-bezier(0.34, 1.4, 0.64, 1) forwards",
          transformOrigin: "center center",
        }}>
          <section
            ref={modalRef}
            style={{
              width: "100%",
              height: "100dvh",
              overflowY: "auto",
              background: "var(--card)",
              scrollbarWidth: "thin",
              transform: `translateX(${swipeDx}px)`,
              opacity: swipeDx === 0 ? 1 : Math.max(0.5, 1 + swipeDx / 250),
              transition: swipeDx === 0 ? "transform .25s ease, opacity .25s ease" : "none",
            }}
          >
            {modalContent}
          </section>
        </div>
      ) : (
        <section
          ref={modalRef}
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
          {modalContent}
        </section>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modal-zoom-in {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
