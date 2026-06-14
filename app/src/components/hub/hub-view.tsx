"use client";
import { useState, useCallback } from "react";
import { useArticles } from "@/hooks/use-articles";
import { useDigest } from "@/hooks/use-digest";
import { useSources } from "@/hooks/use-sources";
import { useTrending } from "@/hooks/use-trending";
import { useSaved } from "@/hooks/use-saved";
import { useRead } from "@/hooks/use-read";
import { useTheme } from "@/hooks/use-theme";
import { SourceSidebar } from "./source-sidebar";
import { CategoryChips } from "./category-chips";
import { TrendingPanel } from "./trending-panel";
import { DigestView } from "./digest-view";
import { ArticleRow } from "./article-row";
import { ReaderModal } from "./reader-modal";
import { FeedManagerDialog } from "./feed-manager-dialog";
import type { ApiArticle } from "@/lib/serialize";
import { Search, RefreshCw, Sun, Moon, Menu } from "lucide-react";
import { toast as sonnerToast } from "sonner";

type Tab = "digest" | "feed" | "saved";

export function HubView() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { sources, reload: reloadSources, addSource, deleteSource } = useSources();
  const { topics } = useTrending(7);
  const { data: digest, loading: digestLoading } = useDigest();
  const { savedIds, savedArticles, toggle: toggleSave } = useSaved();
  const { readIds, markRead } = useRead();

  const [tab, setTab] = useState<Tab>("digest");
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [sort, setSort] = useState<"latest" | "hot">("latest");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openArticle, setOpenArticle] = useState<ApiArticle | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const q = activeTopic ? activeTopic : search;
  const { items, total, loading, hasMore, loadMore, reload: reloadArticles } = useArticles({
    source: activeSource,
    cat: activeCat,
    q,
    sort,
    enabled: tab === "feed",
  });

  const srcMap = new Map(sources.map((s) => [s.id, s]));

  const handleOpen = useCallback((article: ApiArticle) => {
    setOpenArticle(article);
  }, []);

  const handleSave = useCallback(async (article: ApiArticle) => {
    await toggleSave(article);
    const wasSaved = savedIds.has(article.id);
    sonnerToast(wasSaved ? "Đã bỏ lưu bài viết" : "Đã lưu bài viết");
  }, [toggleSave, savedIds]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch("/api/refresh", { method: "POST" });
      reloadArticles();
      reloadSources();
      sonnerToast("Đã làm mới nguồn tin");
    } catch {
      sonnerToast("Lỗi làm mới");
    } finally {
      setRefreshing(false);
    }
  }, [reloadArticles, reloadSources]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px",
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

  const iconBtnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    color: "var(--muted-foreground)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    cursor: "pointer",
    flexShrink: 0,
  };

  const feedTitle = tab === "digest" ? "Đề xuất 7AM" : tab === "saved" ? "Đã lưu" : activeTopic ? `#${activeTopic}` : activeCat ? activeCat : activeSource ? (sources.find((s) => s.id === activeSource)?.label ?? "Dòng tin") : "Dòng tin";

  const displayArticles = tab === "feed" ? items : [];
  const displayCount = tab === "feed" ? total : tab === "saved" ? savedArticles.length : 0;

  return (
    <div style={{ height: "100dvh", display: "grid", gridTemplateRows: "auto 1fr" }}>
      {/* Topbar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 20px",
          height: 56,
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <button
          style={{ ...iconBtnStyle, display: "none" }}
          className="menu-btn-hub"
          aria-label="Nguồn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={18} />
        </button>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 600, fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", flexShrink: 0 }}>
          <span style={{ width: 30, height: 30, borderRadius: 6, background: "var(--primary)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, letterSpacing: ".06em" }}>7A</span>
          <span>7<span style={{ color: "var(--primary)" }}>AM</span> Hub</span>
        </div>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 520, position: "relative" }}>
          <Search size={17} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            type="search"
            placeholder="Tìm tiêu đề, chủ đề, nguồn…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (tab !== "feed") setTab("feed"); }}
            style={{
              width: "100%",
              height: 38,
              borderRadius: 12,
              background: "var(--background)",
              border: "1px solid var(--border)",
              padding: "0 14px 0 38px",
              fontFamily: "inherit",
              fontSize: 14,
              color: "var(--foreground)",
              outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "var(--card)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
          />
        </div>

        <span style={{ flex: 1 }} />

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: "transparent", border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
          <button style={tabStyle(tab === "digest")} onClick={() => setTab("digest")}>Đề xuất 7AM</button>
          <button style={tabStyle(tab === "feed")} onClick={() => setTab("feed")}>Dòng tin</button>
          <button style={tabStyle(tab === "saved")} onClick={() => setTab("saved")}>Đã lưu</button>
        </div>

        <button style={iconBtnStyle} aria-label="Làm mới" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={18} style={{ animation: refreshing ? "spin .8s linear infinite" : "none" }} />
        </button>
        <button style={iconBtnStyle} aria-label="Giao diện" onClick={toggleTheme}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Body: 3 cols */}
      <div style={{ display: "grid", gridTemplateColumns: "264px minmax(0,1fr) 320px", minHeight: 0, height: "100%" }} className="hub-body">
        {/* Left: sources */}
        <div style={{ minHeight: 0, overflow: "hidden" }}>
          <SourceSidebar
            sources={sources}
            activeSourceId={activeSource}
            onSelect={(id) => { setActiveSource(id); if (tab !== "feed") setTab("feed"); }}
            onManage={() => setShowManager(true)}
            onRefreshed={() => { reloadArticles(); reloadSources(); }}
          />
        </div>

        {/* Center: feed */}
        <section style={{ background: "var(--background)", padding: "0 26px", overflowY: "auto", minHeight: 0, scrollbarWidth: "thin" }}>
          <div style={{ maxWidth: 820, marginInline: "auto" }}>
            {/* Sticky head */}
            <div style={{ position: "sticky", top: 0, background: "linear-gradient(var(--background) 78%, transparent)", padding: "22px 0 10px", zIndex: 5 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <h1 style={{ fontSize: 26, fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-.01em", margin: 0 }}>{feedTitle}</h1>
                {displayCount > 0 && (
                  <span style={{ fontSize: 13, color: "var(--muted-foreground)", fontWeight: 400 }}>{displayCount} bài</span>
                )}
              </div>
              {tab === "feed" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <button
                    style={{ padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: sort === "latest" ? "color-mix(in oklab, var(--primary) 12%, var(--card))" : "transparent", border: sort === "latest" ? "1px solid color-mix(in oklab, var(--primary) 35%, transparent)" : "1px solid var(--border)", color: sort === "latest" ? "var(--primary)" : "var(--muted-foreground)", cursor: "pointer", textTransform: "uppercase", letterSpacing: ".05em" }}
                    onClick={() => setSort("latest")}
                  >
                    Mới nhất
                  </button>
                  <button
                    style={{ padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: sort === "hot" ? "color-mix(in oklab, var(--primary) 12%, var(--card))" : "transparent", border: sort === "hot" ? "1px solid color-mix(in oklab, var(--primary) 35%, transparent)" : "1px solid var(--border)", color: sort === "hot" ? "var(--primary)" : "var(--muted-foreground)", cursor: "pointer", textTransform: "uppercase", letterSpacing: ".05em" }}
                    onClick={() => setSort("hot")}
                  >
                    Nổi bật
                  </button>
                  <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 3px" }} />
                  <CategoryChips activeCat={activeCat} onSelect={setActiveCat} />
                </div>
              )}
            </div>

            {/* Content */}
            {tab === "digest" && (
              <DigestView
                digest={digest}
                loading={digestLoading}
                sources={sources}
                readIds={readIds}
                savedIds={savedIds}
                onOpen={handleOpen}
                onSave={handleSave}
              />
            )}

            {tab === "feed" && (
              <div style={{ padding: "6px 0 30px", display: "flex", flexDirection: "column" }}>
                {loading && displayArticles.length === 0 && (
                  <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Đang tải…</div>
                )}
                {!loading && displayArticles.length === 0 && (
                  <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Không có bài nào.</div>
                )}
                {displayArticles.map((a) => (
                  <ArticleRow
                    key={a.id}
                    article={a}
                    source={srcMap.get(a.sourceId)}
                    read={readIds.has(a.id)}
                    saved={savedIds.has(a.id)}
                    onOpen={handleOpen}
                    onSave={handleSave}
                  />
                ))}
                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "14px 20px",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: "var(--muted-foreground)",
                      background: "var(--card)",
                      cursor: "pointer",
                      marginTop: 2,
                      textAlign: "center",
                    }}
                  >
                    {loading ? "Đang tải…" : "Tải thêm"}
                  </button>
                )}
              </div>
            )}

            {tab === "saved" && (
              <div style={{ padding: "6px 0 30px", display: "flex", flexDirection: "column" }}>
                {savedArticles.length === 0 && (
                  <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Chưa có bài nào được lưu.</div>
                )}
                {savedArticles.map((a) => (
                  <ArticleRow
                    key={a.id}
                    article={a}
                    source={srcMap.get(a.sourceId)}
                    read={readIds.has(a.id)}
                    saved={true}
                    onOpen={handleOpen}
                    onSave={handleSave}
                  />
                ))}
              </div>
            )}

            {/* Footer */}
            <footer style={{ maxWidth: 820, margin: "4px auto 40px", padding: "22px 2px 0", borderTop: "1px solid var(--border)", fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.65 }}>
              <div style={{ fontWeight: 600, fontFamily: "var(--font-display)", color: "var(--muted-foreground)", fontSize: 14, marginBottom: 7 }}>
                7<span style={{ color: "var(--primary)" }}>AM</span> Hub
              </div>
              <p>Tổng hợp tin tức qua RSS. Tiêu đề, ảnh và tóm tắt thuộc bản quyền các cơ quan báo chí nguồn — 7AM Hub chỉ hiển thị trích dẫn và liên kết về bài gốc. Tóm tắt & phân loại được hỗ trợ bởi AI.</p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
                <span>© 2026 7AM Hub</span>
                <button onClick={handleRefresh} style={{ fontSize: 12.5, fontWeight: 500, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}>Làm mới</button>
                <button onClick={() => setShowManager(true)} style={{ fontSize: 12.5, fontWeight: 500, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}>Quản lý nguồn</button>
              </div>
            </footer>
          </div>
        </section>

        {/* Right: trending */}
        <div style={{ minHeight: 0, overflow: "hidden" }}>
          <TrendingPanel
            topics={topics}
            featured={digest?.picks[0] ?? null}
            activeTopic={activeTopic}
            onTopicSelect={(tag) => { setActiveTopic(tag); if (tag) setTab("feed"); }}
            onArticleOpen={handleOpen}
          />
        </div>
      </div>

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
        @media (max-width: 1140px) { .hub-body { grid-template-columns: 240px minmax(0,1fr) !important; } .hub-body > div:last-child { display: none; } }
        @media (max-width: 820px) { .hub-body { grid-template-columns: 1fr !important; } .hub-body > div:first-child { display: none; } .menu-btn-hub { display: grid !important; } }
      `}</style>
    </div>
  );
}
