"use client";
import type { MarketData } from "@/app/api/market/route";

const IconDollar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const IconGold = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="9" width="20" height="10" rx="2" />
    <path d="M6 9V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    <line x1="12" y1="12" x2="12" y2="16" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
);

interface Props {
  data: MarketData;
}

export function MarketTicker({ data }: Props) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 2,
      border: "1px solid var(--border)",
      borderRadius: 9,
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {data.usdSell != null && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 11px",
          height: 30,
        }}>
          <span style={{ color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
            <IconDollar />
          </span>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--muted-foreground)", opacity: 0.6 }}>USD</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", fontVariantNumeric: "tabular-nums", marginTop: 1 }}>
              {data.usdSell.toLocaleString("vi-VN")}₫
            </span>
          </div>
        </div>
      )}

      {data.usdSell != null && data.goldVnd != null && (
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
      )}

      {data.goldVnd != null && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 11px",
          height: 30,
        }}>
          <span style={{ color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
            <IconGold />
          </span>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--muted-foreground)", opacity: 0.6 }}>SJC</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", fontVariantNumeric: "tabular-nums", marginTop: 1 }}>
              {data.goldVnd.toLocaleString("vi-VN")}tr/l
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
