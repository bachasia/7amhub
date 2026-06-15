export const CAT_LABELS: Record<string, string> = {
  world: "Thế giới",
  tech: "Công nghệ",
  ai: "AI",
  science: "Khoa học",
  dev: "Lập trình",
  biz: "Kinh doanh",
  sports: "Thể thao",
  local: "Trong nước",
};

export const CAT_COLORS: Record<string, string> = {
  world: "var(--cat-world)",
  tech: "var(--cat-tech)",
  ai: "var(--cat-ai)",
  science: "var(--cat-science)",
  dev: "var(--cat-dev)",
  biz: "var(--cat-biz)",
  sports: "var(--cat-sports)",
  local: "var(--cat-local)",
};

export const CATEGORIES = ["world", "tech", "ai", "science", "dev", "biz", "sports", "local"] as const;
export type Category = (typeof CATEGORIES)[number];

export function catLabel(cat: string | null | undefined): string {
  return cat ? (CAT_LABELS[cat] ?? cat) : "";
}

export function catColor(cat: string | null | undefined): string {
  return cat ? (CAT_COLORS[cat] ?? "var(--muted-foreground)") : "var(--muted-foreground)";
}
