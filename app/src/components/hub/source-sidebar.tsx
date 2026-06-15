"use client";
import { useState, useEffect } from "react";
import { Globe, RefreshCw, ChevronRight, Rss, Video, LayoutGrid } from "lucide-react";
import { SourceFavicon } from "./source-favicon";
import type { ApiSource } from "@/hooks/use-sources";

interface SourceSidebarProps {
  sources: ApiSource[];
  activeSourceId: string | null;
  onSelect: (id: string | null) => void;
  onManage: () => void;
}

type TypeFilter = "all" | "rss" | "youtube";

/** Tách nguồn thành flat (group=null) + folders (theo group, giữ thứ tự xuất hiện). */
function splitByFolder(sources: ApiSource[]) {
  const flat: ApiSource[] = [];
  const folders = new Map<string, ApiSource[]>();
  for (const s of sources) {
    if (!s.group) { flat.push(s); continue; }
    if (!folders.has(s.group)) folders.set(s.group, []);
    folders.get(s.group)!.push(s);
  }
  return { flat, folders };
}

/** Lấy sub-label: ưu tiên sublabel từ DB, sau đó " · " trong label, cuối cùng full label. */
function getSubLabel(src: ApiSource, groupItems: ApiSource[]): string {
  if (groupItems.length <= 1) return src.label;
  if (src.sublabel) return src.sublabel;
  const sep = src.label.indexOf(" · ");
  return sep >= 0 ? src.label.slice(sep + 3) : src.label;
}

export function SourceSidebar({ sources, activeSourceId, onSelect, onManage, onRefreshed }: SourceSidebarProps & { onRefreshed?: () => void }) {
  const total = sources.reduce((n, s) => n + (s.count ?? 0), 0);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Đọc trạng thái folder mở từ localStorage trong effect (tránh hydration mismatch — default đóng khớp server render).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("7am.openGroups");
      if (raw) setOpenGroups(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      try { localStorage.setItem("7am.openGroups", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  // Đếm theo loại + lọc nguồn hiển thị trong sidebar (không đụng feed cột giữa).
  const rssCount = sources.filter((s) => s.type !== "youtube").length;
  const ytCount = sources.filter((s) => s.type === "youtube").length;
  const visible = typeFilter === "all"
    ? sources
    : typeFilter === "youtube"
      ? sources.filter((s) => s.type === "youtube")
      : sources.filter((s) => s.type !== "youtube");
  const { flat, folders } = splitByFolder(visible);

  async function handleRefresh(e: React.MouseEvent, srcId: string) {
    e.stopPropagation();
    if (refreshing) return;
    setRefreshing(srcId);
    try {
      await fetch(`/api/sources/${encodeURIComponent(srcId)}/refresh`, { method: "POST" });
      onRefreshed?.();
    } finally {
      setRefreshing(null);
    }
  }

  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "7px 10px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 400,
    color: active ? "var(--primary)" : "var(--muted-foreground)",
    textAlign: "left",
    cursor: "pointer",
    background: active ? "color-mix(in oklab, var(--primary) 10%, var(--card))" : "none",
    boxShadow: active ? "0 0 0 1px var(--border)" : "none",
    border: "none",
    letterSpacing: 0,
    transition: ".15s",
  });

  const countStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12,
    fontWeight: 500,
    color: active ? "var(--primary)" : "var(--muted-foreground)",
    minWidth: 18,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    opacity: active ? 1 : 0.8,
  });

  const groupLabelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "var(--muted-foreground)",
    padding: "10px 10px 4px",
    opacity: 0.6,
  };

  const groupHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "7px 10px",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: ".04em",
    textTransform: "uppercase",
    color: "var(--muted-foreground)",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: ".15s",
  };

  const typeChipStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    flex: 1,
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: active ? "color-mix(in oklab, var(--primary) 10%, var(--card))" : "none",
    color: active ? "var(--primary)" : "var(--muted-foreground)",
    cursor: "pointer",
    transition: ".15s",
  });

  /** Render 1 feed-row (button + refresh hover). `items` = nhóm để tính sub-label. */
  const renderRow = (src: ApiSource, items: ApiSource[]) => {
    const subLabel = getSubLabel(src, items);
    const active = activeSourceId === src.id;
    const spinning = refreshing === src.id;
    return (
      <div key={src.id} style={{ position: "relative" }} className="source-row">
        <button style={itemStyle(active)} onClick={() => onSelect(src.id)}>
          <SourceFavicon siteUrl={src.siteUrl} label={src.label} size={17} />
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {subLabel}
          </span>
          <span style={countStyle(active)}>{src.count ?? 0}</span>
        </button>
        <button
          className="source-refresh-btn"
          onClick={(e) => handleRefresh(e, src.id)}
          disabled={!!refreshing}
          aria-label="Fetch bài mới"
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            width: 22,
            height: 22,
            borderRadius: 5,
            border: "none",
            background: "var(--muted)",
            color: "var(--muted-foreground)",
            display: "grid",
            placeItems: "center",
            cursor: spinning ? "default" : "pointer",
            opacity: 0,
            transition: ".15s",
            padding: 0,
          }}
        >
          <RefreshCw size={11} style={{ animation: spinning ? "spin .7s linear infinite" : "none" }} />
        </button>
      </div>
    );
  };

  const typeChips: { key: TypeFilter; icon: React.ReactNode; n: number }[] = [
    { key: "all", icon: <LayoutGrid size={16} />, n: sources.length },
    { key: "rss", icon: <Rss size={16} />, n: rssCount },
    { key: "youtube", icon: <Video size={16} />, n: ytCount },
  ];

  return (
    <aside
      style={{
        height: "100%",
        background: "var(--card)",
        borderRight: "1px solid var(--border)",
        padding: "14px 12px",
        overflowY: "auto",
        minHeight: 0,
        scrollbarWidth: "thin",
        boxSizing: "border-box",
      }}
    >
      {/* Feed-type filter row */}
      <div style={{ display: "flex", gap: 6, padding: "0 4px 8px" }}>
        {typeChips.map(({ key, icon, n }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            aria-pressed={typeFilter === key}
            style={typeChipStyle(typeFilter === key)}
          >
            {icon}
            <span style={{ fontSize: 11, fontWeight: 600 }}>{n}</span>
          </button>
        ))}
      </div>

      {/* All sources */}
      <div style={groupLabelStyle}>Nguồn tin</div>
      <button style={itemStyle(activeSourceId === null)} onClick={() => onSelect(null)}>
        <Globe size={17} style={{ flexShrink: 0, color: activeSourceId === null ? "var(--primary)" : "var(--muted-foreground)" }} />
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Tất cả nguồn</span>
        <span style={countStyle(activeSourceId === null)}>{total}</span>
      </button>

      {/* Flat sources (chưa phân loại — không header) */}
      {flat.map((src) => renderRow(src, [src]))}

      {/* Folders (collapsible) */}
      {Array.from(folders.entries()).map(([name, items]) => (
        <div key={name} style={{ marginTop: 6 }}>
          <button
            onClick={() => toggleGroup(name)}
            style={groupHeaderStyle}
            aria-expanded={openGroups.has(name)}
          >
            <ChevronRight size={13} style={{ transform: openGroups.has(name) ? "rotate(90deg)" : "none", transition: ".15s", flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: "left" }}>{name}</span>
            <span style={countStyle(false)}>{items.reduce((n, s) => n + (s.count ?? 0), 0)}</span>
          </button>
          {openGroups.has(name) && (
            <div style={{ paddingLeft: 12 }}>
              {items.map((src) => renderRow(src, items))}
            </div>
          )}
        </div>
      ))}

      {/* Manage */}
      <div style={{ marginTop: 16 }}>
        <div style={groupLabelStyle}>Quản lý nguồn</div>
        <button
          onClick={onManage}
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--muted-foreground)",
            padding: "6px 10px",
            borderRadius: 8,
            border: "none",
            background: "none",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
            transition: ".15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
        >
          + Thêm / xoá nguồn
        </button>
      </div>
      <style>{`
        .source-row:hover .source-refresh-btn { opacity: 1 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </aside>
  );
}
