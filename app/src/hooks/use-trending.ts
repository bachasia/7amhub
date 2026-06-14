"use client";
import { useState, useEffect, useCallback } from "react";

export interface TrendingTopic {
  tag: string;
  count: number;
}

interface TrendingState {
  topics: TrendingTopic[];
  loading: boolean;
  error: string | null;
}

export function useTrending(limit = 7) {
  const [state, setState] = useState<TrendingState>({ topics: [], loading: false, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`/api/trending?limit=${limit}`);
      if (!res.ok) throw new Error(await res.text());
      setState({ topics: await res.json(), loading: false, error: null });
    } catch (e: unknown) {
      setState((s) => ({ ...s, loading: false, error: String(e) }));
    }
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
}
