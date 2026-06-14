"use client";
import { SourceFavicon } from "./source-favicon";
import { ArticleTag } from "./article-tag";
import { SaveButton } from "./save-button";
import type { ApiArticle } from "@/lib/serialize";
import type { ApiSource } from "@/hooks/use-sources";
import { ImageIcon } from "lucide-react";

interface ArticleRowProps {
  article: ApiArticle;
  source?: ApiSource;
  read: boolean;
  saved: boolean;
  onOpen: (article: ApiArticle) => void;
  onSave: (article: ApiArticle) => void;
}

export function ArticleRow({ article, source, read, saved, onOpen, onSave }: ArticleRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(article)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(article)}
      style={{
        display: "flex",
        gap: 13,
        padding: "17px 6px",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
        transition: "background .15s",
        borderRadius: 0,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Unread dot */}
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: read ? "transparent" : "var(--primary)",
          border: read ? "1px solid var(--border)" : "none",
          flexShrink: 0,
          marginTop: 8,
        }}
      />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 5 }}>
          <SourceFavicon siteUrl={source?.siteUrl ?? null} label={article.source} size={16} />
          <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{article.source}</span>
          <span style={{ color: "var(--muted-foreground)" }}>·</span>
          <span>{article.time}</span>
        </div>

        <h2
          style={{
            fontSize: 16,
            lineHeight: 1.38,
            letterSpacing: "-.01em",
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            color: read ? "var(--muted-foreground)" : "var(--foreground)",
            textWrap: "pretty",
            margin: 0,
          }}
        >
          {article.title}
        </h2>

        {article.summary && (
          <p
            style={{
              fontSize: 13.5,
              color: "var(--muted-foreground)",
              lineHeight: 1.62,
              marginTop: 5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {article.summary}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          {article.tags.slice(0, 2).map((t) => <ArticleTag key={t} tag={t} />)}
          <div style={{ marginLeft: "auto", display: "flex" }}>
            <SaveButton article={article} saved={saved} onToggle={onSave} />
          </div>
        </div>
      </div>

      {/* Thumbnail */}
      {article.img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.img}
          alt=""
          style={{
            width: 100,
            height: 72,
            borderRadius: 8,
            flexShrink: 0,
            alignSelf: "center",
            objectFit: "cover",
            background: "var(--muted)",
            border: "1px solid var(--border)",
          }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div
          style={{
            width: 100,
            height: 72,
            borderRadius: 8,
            flexShrink: 0,
            alignSelf: "center",
            display: "grid",
            placeItems: "center",
            background: "repeating-linear-gradient(45deg, color-mix(in srgb, var(--foreground) 4%, var(--background)) 0 12px, color-mix(in srgb, var(--foreground) 8%, var(--background)) 12px 24px)",
            border: "1px solid var(--border)",
          }}
        >
          <ImageIcon size={26} style={{ color: "color-mix(in srgb, var(--foreground) 20%, transparent)" }} />
        </div>
      )}
    </div>
  );
}
