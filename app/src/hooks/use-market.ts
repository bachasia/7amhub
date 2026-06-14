"use client";
import { useState, useEffect } from "react";
import type { MarketData } from "@/app/api/market/route";

const REFRESH_MS = 15 * 60 * 1000;

export function useMarket() {
  const [data, setData] = useState<MarketData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/market");
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return data;
}
