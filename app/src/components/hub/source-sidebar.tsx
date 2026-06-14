"use client";
import { Globe } from "lucide-react";
import { SourceFavicon } from "./source-favicon";
import type { ApiSource } from "@/hooks/use-sources";

interface SourceSidebarProps {
  sources: ApiSource[];
  activeSourceId: string | null;
  onSelect: (id: string | null) => void;
  onManage: () => void;
}

export function SourceSidebar({ sources, activeSourceId, onSelect, onManage }: SourceSidebarProps) {
  const total = sources.reduce((n, s) => n + (s.count ?? 0), 0);

  const linkStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 400,
    color: active ? "var(--primary)" : "var(--muted-foreground)",
    textAlign: "left",
    cursor: "pointer",
    background: active
      ? "color-mix(in oklab, var(--primary) 10%, var(--card))"
      : "none",
    boxShadow: active ? "0 0 0 1px var(--border)" : "none",
    border: "none",
    letterSpacing: 0,
    transition: ".15s",
  });

  return (
    <aside
      style={{
        background: "var(--card)",
        borderRight: "1px solid var(--border)",
        padding: "14px 12px",
        overflowY: "auto",
        minHeight: 0,
        scrollbarWidth: "thin",
      }}
    >
      {/* All sources */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--muted-foreground)",
            padding: "6px 10px",
            opacity: 0.7,
          }}
        >
          Nguồn tin
        </div>

        <button style={linkStyle(activeSourceId === null)} onClick={() => onSelect(null)}>
          <Globe size={17} style={{ flexShrink: 0, color: activeSourceId === null ? "var(--primary)" : "var(--muted-foreground)" }} />
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Tất cả nguồn
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: activeSourceId === null ? "var(--primary)" : "var(--muted-foreground)",
              minWidth: 18,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {total}
          </span>
        </button>

        {sources.map((src) => (
          <button key={src.id} style={linkStyle(activeSourceId === src.id)} onClick={() => onSelect(src.id)}>
            <SourceFavicon siteUrl={src.siteUrl} label={src.label} size={17} />
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {src.label}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: activeSourceId === src.id ? "var(--primary)" : "var(--muted-foreground)",
                opacity: 0.8,
                minWidth: 18,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {src.count ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Manage button */}
      <button
        onClick={onManage}
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--muted-foreground)",
          textTransform: "uppercase",
          letterSpacing: ".08em",
          padding: "3px 8px",
          borderRadius: 6,
          border: "1px solid transparent",
          background: "none",
          cursor: "pointer",
          transition: ".15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--muted)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.borderColor = "transparent";
        }}
      >
        Quản lý nguồn
      </button>
    </aside>
  );
}
