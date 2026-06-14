"use client";
import { useState } from "react";
import { Globe, RefreshCw } from "lucide-react";
import { SourceFavicon } from "./source-favicon";
import type { ApiSource } from "@/hooks/use-sources";

interface SourceSidebarProps {
  sources: ApiSource[];
  activeSourceId: string | null;
  onSelect: (id: string | null) => void;
  onManage: () => void;
}

function groupSources(sources: ApiSource[]): Map<string, ApiSource[]> {
  const map = new Map<string, ApiSource[]>();
  for (const src of sources) {
    const sep = src.label.indexOf(" · ");
    const group = sep >= 0 ? src.label.slice(0, sep) : src.label;
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(src);
  }
  return map;
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
  const groups = groupSources(sources);
  const [refreshing, setRefreshing] = useState<string | null>(null);

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
      {/* All sources */}
      <div style={groupLabelStyle}>Nguồn tin</div>
      <button style={itemStyle(activeSourceId === null)} onClick={() => onSelect(null)}>
        <Globe size={17} style={{ flexShrink: 0, color: activeSourceId === null ? "var(--primary)" : "var(--muted-foreground)" }} />
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Tất cả nguồn</span>
        <span style={countStyle(activeSourceId === null)}>{total}</span>
      </button>

      {/* Grouped sources */}
      {Array.from(groups.entries()).map(([group, items]) => (
        <div key={group} style={{ marginTop: 6 }}>
          {groups.size > 1 && (
            <div style={groupLabelStyle}>{group}</div>
          )}
          {items.map((src) => {
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
          })}
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
