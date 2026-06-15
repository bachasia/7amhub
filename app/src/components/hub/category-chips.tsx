"use client";
import { CATEGORIES, catLabel, catColor } from "@/lib/categories";

interface CategoryChipsProps {
  activeCat: string | null;
  onSelect: (cat: string | null) => void;
}

export function CategoryChips({ activeCat, onSelect }: CategoryChipsProps) {
  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 12px",
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
    textTransform: "uppercase",
    letterSpacing: ".05em",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", alignItems: "center", paddingBottom: 2 }}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          style={chipStyle(activeCat === cat)}
          onClick={() => onSelect(activeCat === cat ? null : cat)}
        >
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: catColor(cat),
              marginRight: 6,
              verticalAlign: "middle",
            }}
          />
          {catLabel(cat)}
        </button>
      ))}
    </div>
  );
}
