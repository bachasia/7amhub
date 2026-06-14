"use client";
import { Bookmark } from "lucide-react";
import type { ApiArticle } from "@/lib/serialize";

interface SaveButtonProps {
  article: ApiArticle;
  saved: boolean;
  onToggle: (article: ApiArticle) => void;
  size?: number;
}

export function SaveButton({ article, saved, onToggle, size = 14 }: SaveButtonProps) {
  return (
    <button
      aria-label={saved ? "Bỏ lưu" : "Lưu bài"}
      onClick={(e) => { e.stopPropagation(); onToggle(article); }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12.5,
        fontWeight: 500,
        color: saved ? "var(--primary)" : "var(--muted-foreground)",
        padding: "5px 10px",
        borderRadius: 8,
        background: "none",
        border: "none",
        cursor: "pointer",
        transition: "background .15s, color .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      <Bookmark size={size} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
