"use client";
import { useCallback } from "react";
import useSWRInfinite from "swr/infinite";
import { fetcher } from "@/lib/swr-fetcher";
import type { ApiArticle } from "@/lib/serialize";

export interface ArticlesFilter {
  source?: string | null;
  cat?: string | null;
  q?: string;
  sort?: "latest" | "hot" | "rank";
  limit?: number;
  enabled?: boolean;
}

interface PageData { total: number; items: ApiArticle[]; }

const PAGE_SIZE = 30;

function buildParams(filter: ArticlesFilter, offset: number): string {
  const p = new URLSearchParams();
  if (filter.source) p.set("source", filter.source);
  if (filter.cat) p.set("cat", filter.cat);
  if (filter.q?.trim()) p.set("q", filter.q.trim());
  if (filter.sort) p.set("sort", filter.sort);
  p.set("limit", String(filter.limit ?? PAGE_SIZE));
  p.set("offset", String(offset));
  return p.toString();
}

export function useArticles(filter: ArticlesFilter = {}) {
  const getKey = useCallback(
    (pageIndex: number, prev: PageData | null) => {
      if (filter.enabled === false) return null;
      if (prev && prev.items.length === 0) return null;
      return `/api/articles?${buildParams(filter, pageIndex * (filter.limit ?? PAGE_SIZE))}`;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter.source, filter.cat, filter.q, filter.sort, filter.limit, filter.enabled]
  );

  const { data, error, isLoading, isValidating, setSize, mutate } =
    useSWRInfinite<PageData>(getKey, fetcher, {
      revalidateOnFocus: false,
      revalidateFirstPage: false,  // don't re-fetch page 0 when loading more pages
      parallel: false,             // fetch pages sequentially (avoids offset race)
    });

  const items = data?.flatMap((p) => p.items) ?? [];
  const total = data?.[0]?.total ?? 0;
  const hasMore = items.length < total;

  const loadMore = useCallback(() => setSize((s) => s + 1), [setSize]);
  const reload = useCallback(() => {
    setSize(1);   // reset to 1 page
    mutate();     // revalidate
  }, [setSize, mutate]);

  return {
    items,
    total,
    loading: isLoading || isValidating,
    error: error ? String(error) : null,
    hasMore,
    loadMore,
    reload,
  };
}
