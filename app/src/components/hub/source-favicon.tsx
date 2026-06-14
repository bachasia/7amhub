"use client";
import { useState } from "react";

interface SourceFaviconProps {
  siteUrl: string | null;
  label: string;
  size?: number;
  className?: string;
}

export function SourceFavicon({ siteUrl, label, size = 16, className }: SourceFaviconProps) {
  const [failed, setFailed] = useState(false);

  let host = "";
  try {
    host = new URL(siteUrl ?? "https://example.com").hostname;
  } catch {
    host = "example.com";
  }

  if (failed) {
    return (
      <span
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          background: "var(--muted)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.55,
          color: "var(--background)",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {label.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?sz=64&domain=${host}`}
      alt={label}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}
