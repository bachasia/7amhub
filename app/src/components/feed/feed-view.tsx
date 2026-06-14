"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useArticles } from "@/hooks/use-articles";
import { useDigest } from "@/hooks/use-digest";
import { useSources } from "@/hooks/use-sources";
import { useSaved } from "@/hooks/use-saved";
import { useRead } from "@/hooks/use-read";
import { useTheme } from "@/hooks/use-theme";
import { ArticleCard } from "./article-card";
import { ReaderModal } from "@/components/hub/reader-modal";
import { FeedManagerDialog } from "@/components/hub/feed-manager-dialog";
import type { ApiArticle } from "@/lib/serialize";
import { RefreshCw, Sun, Moon, Bookmark, Rss, ChevronDown } from "lucide-react";
import { toast as sonnerToast } from "sonner";

type Chip = "digest" | "all" | string; // category key

// Digest cards: first = intro, then picks
function digestCards(digest: ReturnType<typeof useDigest>["data"]): ApiArticle[] {
  if (!digest || !digest.hasDigest) return [];
  return [...digest.picks, ...digest.byCat.flatMap((g) => g.items)];
}

export function FeedView() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { sources, addSource, deleteSource } = useSources();
  const { savedIds, savedArticles, toggle: toggleSave } = useSaved();
  const { readIds, markRead } = useRead();
  const { data: digest } = useDigest();

  const [chip, setChip] = useState<Chip>("digest");
  const [openArticle, setOpenArticle] = useState<ApiArticle | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);

  const isDigest = chip === "digest";
  const catFilter = chip !== "digest" && chip !== "all" ? chip : null;

  const { items: feedItems, hasMore, loadMore } = useArticles({
    cat: catFilter,
    sort: "latest",
    enabled: !isDigest,
  });

  const cards: ApiArticle[] = isDigest ? digestCards(digest) : feedItems;

  const srcMap = new Map(sources.map((s) => [s.id, s]));

  // Track scroll position for rail dots + load-more
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const handler = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActiveIdx(idx);
      if (!hasScrolled && el.scrollTop > 20) setHasScrolled(true);
      // Auto load more when near end
      if (hasMore && idx >= cards.length - 3) loadMore();
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [hasScrolled, hasMore, cards.length, loadMore]);

  // Reset scroll when chip changes
  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0 });
    setActiveIdx(0);
  }, [chip]);

  const handleOpen = useCallback((article: ApiArticle) => {
    setOpenArticle(article);
    markRead(article.id);
  }, [markRead]);

  const handleSave = useCallback(async (article: ApiArticle) => {
    await toggleSave(article);
    sonnerToast(savedIds.has(article.id) ? "Đã bỏ lưu" : "Đã lưu bài viết");
  }, [toggleSave, savedIds]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch("/api/refresh", { method: "POST" });
      sonnerToast("Đã làm mới nguồn tin");
    } catch {
      sonnerToast("Lỗi làm mới");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const chips: { key: Chip; label: string }[] = [
    { key: "digest", label: "🔥 7AM" },
    { key: "all", label: "Tất cả" },
    { key: "tech", label: "Công nghệ" },
    { key: "science", label: "Khoa học" },
    { key: "world", label: "Thế giới" },
    { key: "news", label: "Thời sự" },
    { key: "biz", label: "Kinh doanh" },
  ];

  const iconBtnStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    color: "var(--foreground)",
    background: "none",
    border: "none",
    cursor: "pointer",
    position: "relative",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        height: "100dvh",
        position: "relative",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        margin: "0 auto",
      }}
    >
      {/* Topbar */}
      <div style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", flexShrink: 0, paddingTop: "max(10px, env(safe-area-inset-top))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px 10px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, letterSpacing: "-.02em", display: "flex", alignItems: "baseline", gap: 7 }}>
            7<span style={{ color: "#c96442" }}>AM</span> Hub
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "inherit", fontWeight: 500, marginLeft: 2 }}>
              {new Date().toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" })}
            </span>
          </div>
          <span style={{ flex: 1 }} />
          <button style={iconBtnStyle} aria-label="Quản lý nguồn" onClick={() => setShowManager(true)}>
            <Rss size={22} />
          </button>
          <button style={{ ...iconBtnStyle, position: "relative" }} aria-label="Đã lưu" onClick={() => setShowSaved(true)}>
            <Bookmark size={22} />
            {savedIds.size > 0 && (
              <span style={{
                position: "absolute", top: 4, right: 4,
                minWidth: 16, height: 16, padding: "0 4px",
                background: "#c96442", color: "#fff", borderRadius: 9, fontSize: 10, fontWeight: 700,
                display: "grid", placeItems: "center",
              }}>
                {savedIds.size > 9 ? "9+" : savedIds.size}
              </span>
            )}
          </button>
          <button style={iconBtnStyle} aria-label="Làm mới" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={22} style={{ animation: refreshing ? "spin .8s linear infinite" : "none" }} />
          </button>
          <button style={iconBtnStyle} aria-label="Giao diện" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
          </button>
        </div>

        {/* Chip rail */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 16px 12px", scrollbarWidth: "none" }}>
          {chips.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setChip(key)}
              style={{
                flexShrink: 0,
                padding: "7px 15px",
                borderRadius: 9999,
                fontSize: 13.5,
                fontWeight: 600,
                background: chip === key ? "var(--foreground)" : "color-mix(in srgb, var(--foreground) 7%, transparent)",
                color: chip === key ? "var(--background)" : "var(--foreground)",
                border: "1px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all .15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        style={{
          flex: 1,
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          scrollbarWidth: "none",
          position: "relative",
        }}
      >
        {cards.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted-foreground)", gap: 12, padding: 24 }}>
            {isDigest ? (
              <p style={{ textAlign: "center", fontSize: 15 }}>Bản tin 7AM chưa có hôm nay. Hẹn gặp lại lúc 07:00 sáng!</p>
            ) : (
              <p style={{ textAlign: "center", fontSize: 15 }}>Không có bài nào.</p>
            )}
          </div>
        )}

        {cards.map((article, i) => (
          <div key={article.id} style={{ height: "100%", scrollSnapAlign: "start", scrollSnapStop: "always" }}>
            <ArticleCard
              article={article}
              saved={savedIds.has(article.id)}
              onOpen={handleOpen}
              onSave={handleSave}
            />
          </div>
        ))}

        {/* Swipe hint */}
        {!hasScrolled && cards.length > 1 && (
          <div style={{
            position: "absolute", left: "50%", bottom: 24, transform: "translateX(-50%)",
            zIndex: 15, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: "rgba(255,255,255,.9)", fontSize: 11, fontWeight: 600, pointerEvents: "none",
            animation: "bob 1.6s ease-in-out infinite",
          }}>
            <ChevronDown size={20} />
            Vuốt
          </div>
        )}
      </div>

      {/* Rail dots */}
      {cards.length > 1 && (
        <div style={{
          position: "absolute",
          right: 7,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          gap: 7,
          pointerEvents: "none",
        }}>
          {cards.slice(0, 12).map((_, i) => (
            <div
              key={i}
              style={{
                width: 5,
                borderRadius: 4,
                background: i === activeIdx ? "#c96442" : "color-mix(in srgb, var(--foreground) 30%, transparent)",
                height: i === activeIdx ? 18 : 5,
                transition: "all .25s",
              }}
            />
          ))}
        </div>
      )}

      {/* Saved sheet */}
      {showSaved && (
        <>
          <div
            onClick={() => setShowSaved(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(7,8,9,.5)", zIndex: 40 }}
          />
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 50,
            background: "var(--card)", borderRadius: "22px 22px 0 0",
            maxHeight: "78%", display: "flex", flexDirection: "column",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--border)", margin: "10px auto 4px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 12px" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>Bài đã lưu</h3>
              <button onClick={() => setShowSaved(false)} style={{ fontSize: 14, fontWeight: 600, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}>Đóng</button>
            </div>
            <div style={{ overflowY: "auto", padding: "0 14px 18px" }}>
              {savedArticles.length === 0 && (
                <p style={{ color: "var(--muted-foreground)", fontSize: 14, padding: "16px 4px" }}>Chưa có bài nào được lưu.</p>
              )}
              {savedArticles.map((a) => (
                <div
                  key={a.id}
                  onClick={() => { handleOpen(a); setShowSaved(false); }}
                  style={{ display: "flex", gap: 12, padding: 11, borderRadius: 14, alignItems: "center", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--foreground) 5%, transparent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {a.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.img} alt="" style={{ width: 62, height: 48, borderRadius: 9, objectFit: "cover", background: "var(--muted)", flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div style={{ width: 62, height: 48, borderRadius: 9, background: "var(--muted)", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.title}</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>{a.source} · {a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Reader modal */}
      {openArticle && (
        <ReaderModal
          article={openArticle}
          source={srcMap.get(openArticle.sourceId)}
          savedIds={savedIds}
          onSave={handleSave}
          onClose={() => setOpenArticle(null)}
          onMarkRead={markRead}
        />
      )}

      {/* Feed manager */}
      {showManager && (
        <FeedManagerDialog
          sources={sources}
          onAdd={addSource}
          onDelete={deleteSource}
          onClose={() => setShowManager(false)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bob { 0%,100% { transform: translate(-50%,0); } 50% { transform: translate(-50%,7px); } }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
