"use client";
import { useState, useEffect, useCallback } from "react";

export interface ApiSource {
  id: string;
  label: string;
  url: string;
  siteUrl: string | null;
  active: boolean;
  count: number;
}

interface SourcesState {
  sources: ApiSource[];
  loading: boolean;
  error: string | null;
}

export function useSources() {
  const [state, setState] = useState<SourcesState>({ sources: [], loading: false, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/sources");
      if (!res.ok) throw new Error(await res.text());
      setState({ sources: await res.json(), loading: false, error: null });
    } catch (e: unknown) {
      setState((s) => ({ ...s, loading: false, error: String(e) }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addSource = useCallback(async (label: string, url: string): Promise<ApiSource> => {
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Lỗi thêm nguồn.");
    setState((s) => ({ ...s, sources: [...s.sources, data] }));
    return data;
  }, []);

  const deleteSource = useCallback(async (id: string) => {
    const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Lỗi xóa nguồn.");
    setState((s) => ({ ...s, sources: s.sources.filter((src) => src.id !== id) }));
  }, []);

  return { ...state, reload: load, addSource, deleteSource };
}
