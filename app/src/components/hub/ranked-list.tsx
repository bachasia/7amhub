"use client";
import type { ApiArticle } from "@/lib/serialize";
import { SaveButton } from "./save-button";
import { ImageIcon } from "lucide-react";

interface RankedListProps {
  items: ApiArticle[];
  savedIds: Set<string>;
  onOpen: (article: ApiArticle) => void;
  onSave: (article: ApiArticle) => void;
}

/** Màu huy hiệu thứ hạng: top-3 nổi bật, còn lại trung tính. */
function rankColor(rank: number): { bg: string; fg: string } {
  if (rank === 0) return { bg: "#f5b301", fg: "#1a1206" };
  if (rank === 1) return { bg: "#b8c0c8", fg: "#1a1d20" };
  if (rank === 2) return { bg: "#cd7f4b", fg: "#1a1206" };
  return { bg: "color-mix(in oklab, var(--foreground) 8%, transparent)", fg: "var(--muted-foreground)" };
}

/**
 * Layout bảng xếp hạng cho nguồn trending: thứ hạng (vị trí trong RSS) + tên + mô tả 1 dòng + ảnh.
 * Sort theo `rank` (feed_order), không dùng hot-score. Refresh ghi đè rank mỗi ngày.
 */
export function RankedList({ items, savedIds, onOpen, onSave }: RankedListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "6px 0 30px" }}>
      {items.map((a) => {
        const rank = a.rank ?? 0;
        const c = rankColor(rank);
        const title = a.viTitle || a.title;
        return (
          <div
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(a)}
            onKeyDown={(e) => e.key === "Enter" && onOpen(a)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 6px",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {/* Rank badge */}
            <span
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: 8,
                background: c.bg,
                color: c.fg,
                display: "grid",
                placeItems: "center",
                fontSize: 13,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {rank + 1}
            </span>

            {/* Thumbnail */}
            {a.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.img}
                alt=""
                style={{ width: 64, height: 48, borderRadius: 8, objectFit: "cover", background: "var(--muted)", flexShrink: 0 }}
                onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
              />
            ) : (
              <div style={{ width: 64, height: 48, borderRadius: 8, background: "var(--muted)", flexShrink: 0, display: "grid", placeItems: "center", color: "var(--muted-foreground)" }}>
                <ImageIcon size={18} />
              </div>
            )}

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {title}
              </p>
              {a.summary && (
                <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.4, margin: "3px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {a.summary}
                </p>
              )}
              <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", margin: "4px 0 0" }}>{a.host || a.source}</p>
            </div>

            {/* Save */}
            <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
              <SaveButton article={a} saved={savedIds.has(a.id)} onToggle={onSave} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
