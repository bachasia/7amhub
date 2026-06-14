interface ArticleTagProps {
  tag: string;
}

export function ArticleTag({ tag }: ArticleTagProps) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 9999,
        background: "color-mix(in oklab, var(--primary) 10%, var(--background))",
        color: "var(--primary)",
        letterSpacing: ".08em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {tag}
    </span>
  );
}
