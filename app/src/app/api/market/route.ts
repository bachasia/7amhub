export const runtime = "nodejs";
export const revalidate = 900; // 15-min cache

import { NextResponse } from "next/server";

export interface MarketData {
  usdSell: number | null;  // VCB sell rate (VND per USD)
  goldVnd: number | null;  // SJC gold sell price (triệu VND per lượng)
  updatedAt: number;
}

async function fetchUsd(): Promise<number | null> {
  const res = await fetch(
    "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx",
    { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return null;
  const xml = await res.text();
  const m = xml.match(/CurrencyCode="USD"[^/]*Sell="([\d,.]+)"/);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ""));
}

// Scrape SJC HCM sell price from giavang.org
// Values use . as thousands sep (e.g. "147.000" = 147,000 nghìn = 147 triệu VND/lượng)
async function fetchGold(): Promise<number | null> {
  try {
    const res = await fetch("https://giavang.org/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Find SJC section, then extract buy + sell from gold-price spans (x1000đ/lượng units)
    const m = html.match(/gia_vang_sjc[\s\S]{0,300}gold-price">([\d.]+)[\s\S]{0,500}gold-price">([\d.]+)/);
    if (!m) return null;
    // Sell price is the second span; "147.000" → remove dots → 147000 × 1000đ = 147 triệu VND/lượng
    const sellVal = parseInt(m[2].replace(/\./g, ""), 10);
    return sellVal / 1000;
  } catch {
    return null;
  }
}

export async function GET() {
  const [usdSell, goldVnd] = await Promise.allSettled([fetchUsd(), fetchGold()]).then(
    (rs) => rs.map((r) => (r.status === "fulfilled" ? r.value : null))
  );
  return NextResponse.json({ usdSell, goldVnd, updatedAt: Date.now() } satisfies MarketData);
}
