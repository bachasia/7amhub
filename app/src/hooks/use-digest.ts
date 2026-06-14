"use client";
import { useState, useEffect, useCallback } from "react";
import type { ApiArticle } from "@/lib/serialize";

export interface DigestGroup {
  cat: string;
  items: ApiArticle[];
}

export interface DigestCluster {
  event: string;
  sources: string[];
  articles: ApiArticle[];
}

export interface DigestData {
  date: string;
  hasDigest: boolean;
  intro: string;
  picks: ApiArticle[];
  byCat: DigestGroup[];
  clusters: DigestCluster[];
}

interface DigestState {
  data: DigestData | null;
  loading: boolean;
  error: string | null;
}

export function useDigest() {
  const [state, setState] = useState<DigestState>({ data: null, loading: false, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/digest/today");
      if (!res.ok) throw new Error(await res.text());
      const data: DigestData = await res.json();
      setState({ data, loading: false, error: null });
    } catch (e: unknown) {
      setState((s) => ({ ...s, loading: false, error: String(e) }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
}
