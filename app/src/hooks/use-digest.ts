"use client";
import { useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";
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

const KEY = "/api/digest/today";

export function useDigest() {
  const { data, error, isLoading, mutate } = useSWR<DigestData>(KEY, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false, // digest only changes once per day
    dedupingInterval: 60_000,
  });

  const reload = useCallback(() => mutate(), [mutate]);

  return {
    data: data ?? null,
    loading: isLoading,
    error: error ? String(error) : null,
    reload,
  };
}
