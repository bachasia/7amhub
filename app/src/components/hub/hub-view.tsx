"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useArticles } from "@/hooks/use-articles";
import { useDigest } from "@/hooks/use-digest";
import { useSources } from "@/hooks/use-sources";
import { useTrending } from "@/hooks/use-trending";
import { useSaved } from "@/hooks/use-saved";
import { useRead } from "@/hooks/use-read";
import { useTheme } from "@/hooks/use-theme";
import { useMarket } from "@/hooks/use-market";
import { useWorkerStatus } from "@/hooks/use-worker-status";
import { MarketTicker } from "./market-ticker";
import { SourceSidebar } from "./source-sidebar";
import { catLabel, catColor, CATEGORIES } from "@/lib/categories";
import { TrendingPanel } from "./trending-panel";
import { ChatPanel } from "./chat-panel";
import { DigestView } from "./digest-view";
import { ArticleRow } from "./article-row";
import { RankedList } from "./ranked-list";
import { ReaderModal } from "./reader-modal";
import { FeedManagerDialog } from "./feed-manager-dialog";
import type { ApiArticle } from "@/lib/serialize";
import { Search, RefreshCw, Sun, Moon, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { toast as sonnerToast } from "sonner";

type Tab = "digest" | "feed" | "saved";
type RightTab = "trending" | "chat";

export function HubView() {
  const { theme, toggle: toggleTheme } = useTheme();
  const market = useMarket();
  const { status: workerStatus, lastSeen: workerLastSeen } = useWorkerStatus();
  const { sources, reload: reloadSources, addSource, deleteSource, updateSource } = useSources();
  const { topics } = useTrending(7);
  const { data: digest, loading: digestLoading } = useDigest();
  const { savedIds, savedArticles, toggle: toggleSave } = useSaved();
  const { readIds, markRead } = useRead();

  const [tab, setTab] = useState<Tab>("digest");
  const [rightTab, setRightTab] = useState<RightTab>("trending");
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [sort, setSort] = useState<"latest" | "hot">("latest");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openArticle, setOpenArticle] = useState<ApiArticle | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Chip track scroll state for arrow nav
  const chipTrackRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [chipScroll, setChipScroll] = useState({ left: false, right: true });

  const checkChipScroll = useCallback(() => {
    const el = chipTrackRef.current;
    if (!el) return;
    setChipScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    });
  }, []);

  const scrollChips = useCallback((dir: "left" | "right") => {
    chipTrackRef.current?.scrollBy({ left: dir === "right" ? 180 : -180, behavior: "smooth" });
  }, []);

  // Re-check when tab switches to feed
  useEffect(() => {
    if (tab === "feed") setTimeout(checkChipScroll, 50);
  }, [tab, checkChipScroll]);

  // Swipe gesture for mobile drawer — manipulate DOM directly to avoid re-render jank
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    const g = { active: false, startX: 0, startY: 0, startTime: 0, drawerWidth: 0, type: "" as "" | "open" | "close" };

    function start(e: TouchEvent) {
      const t = e.touches[0];
      const dw = drawer.offsetWidth || Math.min(window.innerWidth * 0.88, 320);
      if (!sidebarOpen && t.clientX <= 20) {
        Object.assign(g, { active: true, startX: t.clientX, startY: t.clientY, startTime: Date.now(), drawerWidth: dw, type: "open" });
        drawer.style.transition = "none";
        drawer.style.transform = `translateX(-${dw}px)`;
      } else if (sidebarOpen && t.clientX <= dw) {
        Object.assign(g, { active: true, startX: t.clientX, startY: t.clientY, startTime: Date.now(), drawerWidth: dw, type: "close" });
        drawer.style.transition = "none";
      }
    }

    function move(e: TouchEvent) {
      if (!g.active) return;
      const dx = e.touches[0].clientX - g.startX;
      const dy = Math.abs(e.touches[0].clientY - g.startY);
      // Cancel if vertical scroll intent
      if (dy > Math.abs(dx) + 8 && Math.abs(dx) < 20) {
        g.active = false;
        drawer.style.transition = "transform .25s cubic-bezier(.4,0,.2,1)";
        drawer.style.transform = g.type === "open" ? `translateX(-${g.drawerWidth}px)` : "translateX(0)";
        return;
      }
      e.preventDefault();
      if (g.type === "open") {
        drawer.style.transform = `translateX(${Math.max(-g.drawerWidth, Math.min(0, dx - g.drawerWidth))}px)`;
      } else if (g.type === "close" && dx <= 0) {
        drawer.style.transform = `translateX(${Math.max(-g.drawerWidth, dx)}px)`;
      }
    }

    function end(e: TouchEvent) {
      if (!g.active) return;
      g.active = false;
      const dx = e.changedTouches[0].clientX - g.startX;
      const velocity = dx / Math.max(Date.now() - g.startTime, 1); // px/ms
      drawer.style.transition = "transform .25s cubic-bezier(.4,0,.2,1)";
      if (g.type === "open") {
        if (dx > g.drawerWidth * 0.3 || velocity > 0.4) {
          drawer.style.transform = "translateX(0)";
          setSidebarOpen(true);
        } else {
          drawer.style.transform = `translateX(-${g.drawerWidth}px)`;
        }
      } else if (g.type === "close") {
        if (dx < -g.drawerWidth * 0.3 || velocity < -0.4) {
          drawer.style.transform = `translateX(-${g.drawerWidth}px)`;
          setTimeout(() => setSidebarOpen(false), 260);
        } else {
          drawer.style.transform = "translateX(0)";
        }
      }
    }

    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end, { passive: true });
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
    };
  }, [sidebarOpen]);

  // Nguồn trending: hiển thị bảng xếp hạng theo `rank`, ẩn chip lọc/sort.
  const isTrendingView = tab === "feed" && sources.find((s) => s.id === activeSource)?.type === "trending";

  const q = activeTopic ? activeTopic : search;
  const { items, total, loading, hasMore, loadMore, reload: reloadArticles } = useArticles({
    source: activeSource,
    cat: isTrendingView ? null : activeCat,
    q: isTrendingView ? "" : q,
    sort: isTrendingView ? "rank" : sort,
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

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 13px",
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    background: active
      ? "color-mix(in oklab, var(--primary) 12%, var(--card))"
      : "transparent",
    border: active
      ? "1px solid color-mix(in oklab, var(--primary) 35%, transparent)"
      : "1px solid var(--border)",
    color: active ? "var(--primary)" : "var(--muted-foreground)",
    cursor: "pointer",
    transition: ".15s",
    textTransform: "uppercase" as const,
    letterSpacing: ".05em",
    whiteSpace: "nowrap",
    flexShrink: 0,
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

  const feedTitle = tab === "digest" ? "Đề xuất 7AM" : tab === "saved" ? "Đã lưu" : activeTopic ? `#${activeTopic}` : activeCat ? catLabel(activeCat) : activeSource ? (sources.find((s) => s.id === activeSource)?.label ?? "Dòng tin") : "Dòng tin";

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
          <span style={{ width: 30, height: 30, borderRadius: 6, background: "var(--primary)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, letterSpacing: ".06em" }}>7H</span>
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

        {/* Market ticker */}
        {market && <MarketTicker data={market} />}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: "transparent", border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
          <button style={tabStyle(tab === "digest")} onClick={() => setTab("digest")}>Đề xuất 7AM</button>
          <button style={tabStyle(tab === "feed")} onClick={() => setTab("feed")}>Dòng tin</button>
          <button style={tabStyle(tab === "saved")} onClick={() => setTab("saved")}>Đã lưu</button>
        </div>

        {/* Worker status dot */}
        <WorkerDot status={workerStatus} lastSeen={workerLastSeen} />

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
              {tab === "feed" && !isTrendingView && (
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Sort — pinned, never scrolls */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button style={chipStyle(sort === "latest")} onClick={() => setSort("latest")}>Mới nhất</button>
                    <button style={chipStyle(sort === "hot")} onClick={() => setSort("hot")}>Nổi bật</button>
                  </div>
                  {/* Divider */}
                  <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />
                  {/* Category scrollable track */}
                  <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
                    {/* Left fade + arrow */}
                    {chipScroll.left && (
                      <>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 4, width: 40, background: "linear-gradient(to left, transparent, var(--background) 80%)", pointerEvents: "none", zIndex: 2 }} />
                        <button onClick={() => scrollChips("left")} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-60%)", zIndex: 3, width: 24, height: 24, borderRadius: "50%", background: "var(--card)", border: "1px solid var(--border)", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted-foreground)", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
                          <ChevronLeft size={13} />
                        </button>
                      </>
                    )}
                    {/* Right fade + arrow */}
                    {chipScroll.right && (
                      <>
                        <div style={{ position: "absolute", right: 0, top: 0, bottom: 4, width: 40, background: "linear-gradient(to right, transparent, var(--background) 80%)", pointerEvents: "none", zIndex: 2 }} />
                        <button onClick={() => scrollChips("right")} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-60%)", zIndex: 3, width: 24, height: 24, borderRadius: "50%", background: "var(--card)", border: "1px solid var(--border)", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted-foreground)", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
                          <ChevronRight size={13} />
                        </button>
                      </>
                    )}
                    <div
                      ref={chipTrackRef}
                      onScroll={checkChipScroll}
                      style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", alignItems: "center", paddingBottom: 4, paddingLeft: chipScroll.left ? 32 : 0, paddingRight: chipScroll.right ? 44 : 0 }}
                    >
                      {CATEGORIES.map((cat) => (
                        <button key={cat} style={chipStyle(activeCat === cat)} onClick={() => setActiveCat(activeCat === cat ? null : cat)}>
                          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: catColor(cat), marginRight: 6, verticalAlign: "middle" }} />
                          {catLabel(cat)}
                        </button>
                      ))}
                    </div>
                  </div>
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

            {tab === "feed" && isTrendingView && (
              <>
                {loading && displayArticles.length === 0 && (
                  <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Đang tải…</div>
                )}
                {!loading && displayArticles.length === 0 && (
                  <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Chưa có dữ liệu trending. Bấm “Làm mới”.</div>
                )}
                <RankedList items={displayArticles} savedIds={savedIds} onOpen={handleOpen} onSave={handleSave} />
              </>
            )}

            {tab === "feed" && !isTrendingView && (
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

        {/* Right: trending / chat */}
        <div style={{ minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Right panel toggle */}
          <div style={{ display: "flex", gap: 2, padding: "10px 14px 0", background: "var(--card)", borderLeft: "1px solid var(--border)", flexShrink: 0 }}>
            <button
              onClick={() => setRightTab("trending")}
              style={{ ...tabStyle(rightTab === "trending"), fontSize: 10, padding: "4px 10px" }}
            >
              Xu hướng
            </button>
            <button
              onClick={() => setRightTab("chat")}
              style={{ ...tabStyle(rightTab === "chat"), fontSize: 10, padding: "4px 10px" }}
            >
              Hỏi đáp
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            {rightTab === "trending" ? (
              <TrendingPanel
                topics={topics}
                featured={digest?.picks ?? []}
                activeTopic={activeTopic}
                onTopicSelect={(tag) => { setActiveTopic(tag); if (tag) setTab("feed"); }}
                onArticleOpen={handleOpen}
              />
            ) : (
              <ChatPanel onOpenArticle={handleOpen} />
            )}
          </div>
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
          onUpdate={updateSource}
          onClose={() => setShowManager(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,.45)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        />
      )}
      <div
        ref={drawerRef}
        className="mobile-drawer"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(88vw, 320px)",
          zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .25s cubic-bezier(.4,0,.2,1)",
          willChange: "transform",
          overflowY: "auto",
          boxShadow: "6px 0 32px rgba(0,0,0,.18)",
        }}
      >
        <SourceSidebar
          sources={sources}
          activeSourceId={activeSource}
          onSelect={(id) => { setActiveSource(id); setSidebarOpen(false); if (tab !== "feed") setTab("feed"); }}
          onManage={() => { setShowManager(true); setSidebarOpen(false); }}
          onRefreshed={() => { reloadArticles(); reloadSources(); }}
        />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:.35; } }
        @media (max-width: 1140px) { .hub-body { grid-template-columns: 240px minmax(0,1fr) !important; } .hub-body > div:last-child { display: none; } }
        @media (max-width: 820px) { .hub-body { grid-template-columns: 1fr !important; } .hub-body > div:first-child { display: none; } .menu-btn-hub { display: grid !important; } }
        @media (min-width: 821px) { .mobile-drawer { display: none !important; } }
      `}</style>
    </div>
  );
}

type WorkerDotProps = { status: "alive" | "offline" | "unknown"; lastSeen: number | null };
function WorkerDot({ status, lastSeen }: WorkerDotProps) {
  const color = status === "alive" ? "#22c55e" : status === "offline" ? "#ef4444" : "#94a3b8";
  const label =
    status === "alive"
      ? `Worker đang chạy${lastSeen ? ` · ${Math.round((Date.now() - lastSeen) / 60_000)} phút trước` : ""}`
      : status === "offline"
      ? "Worker không hoạt động"
      : "Đang kiểm tra worker…";

  return (
    <div
      title={label}
      aria-label={label}
      style={{ display: "flex", alignItems: "center", gap: 5, cursor: "default", flexShrink: 0 }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          display: "block",
          animation: status === "alive" ? "pulse-dot 2s ease-in-out infinite" : "none",
        }}
      />
      <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>Worker</span>
    </div>
  );
}
