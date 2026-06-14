export const CAT_LABELS: Record<string, string> = {
  world: "Thế giới",
  tech: "Công nghệ",
  ai: "AI",
  science: "Khoa học",
  news: "Thời sự",
  biz: "Kinh doanh",
};

export const CAT_COLORS: Record<string, string> = {
  world: "var(--cat-world)",
  tech: "var(--cat-tech)",
  ai: "var(--cat-ai)",
  science: "var(--cat-science)",
  news: "var(--cat-news)",
  biz: "var(--cat-biz)",
};

export const CATEGORIES = ["world", "tech", "ai", "science", "news", "biz"] as const;
export type Category = (typeof CATEGORIES)[number];

export function catLabel(cat: string | null | undefined): string {
  return cat ? (CAT_LABELS[cat] ?? cat) : "";
}

export function catColor(cat: string | null | undefined): string {
  return cat ? (CAT_COLORS[cat] ?? "var(--muted-foreground)") : "var(--muted-foreground)";
}
