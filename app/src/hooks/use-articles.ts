"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { ApiArticle } from "@/lib/serialize";

export interface ArticlesFilter {
  source?: string | null;
  cat?: string | null;
  q?: string;
  sort?: "latest" | "hot";
  limit?: number;
  enabled?: boolean;
}

interface ArticlesState {
  items: ApiArticle[];
  total: number;
  loading: boolean;
  error: string | null;
}

const PAGE_SIZE = 30;

export function useArticles(filter: ArticlesFilter = {}) {
  const [state, setState] = useState<ArticlesState>({ items: [], total: 0, loading: false, error: null });
  const [offset, setOffset] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(
    async (off: number, append: boolean) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const p = new URLSearchParams();
        if (filter.source) p.set("source", filter.source);
        if (filter.cat) p.set("cat", filter.cat);
        if (filter.q?.trim()) p.set("q", filter.q.trim());
        if (filter.sort) p.set("sort", filter.sort);
        p.set("limit", String(filter.limit ?? PAGE_SIZE));
        p.set("offset", String(off));

        const res = await fetch(`/api/articles?${p}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(await res.text());
        const data: { total: number; items: ApiArticle[] } = await res.json();
        setState((s) => ({
          items: append ? [...s.items, ...data.items] : data.items,
          total: data.total,
          loading: false,
          error: null,
        }));
      } catch (e: unknown) {
        if ((e as { name?: string }).name === "AbortError") return;
        setState((s) => ({ ...s, loading: false, error: String(e) }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter.source, filter.cat, filter.q, filter.sort, filter.limit]
  );

  // Reset and reload whenever filter changes (skip when disabled)
  useEffect(() => {
    if (filter.enabled === false) return;
    setOffset(0);
    fetch_(0, false);
  }, [fetch_, filter.enabled]);

  const loadMore = useCallback(() => {
    const next = offset + (filter.limit ?? PAGE_SIZE);
    setOffset(next);
    fetch_(next, true);
  }, [offset, filter.limit, fetch_]);

  const reload = useCallback(() => {
    setOffset(0);
    fetch_(0, false);
  }, [fetch_]);

  const hasMore = state.items.length < state.total;

  return { ...state, hasMore, loadMore, reload };
}
