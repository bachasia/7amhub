"use client";
import { useState, useEffect, useCallback } from "react";

export interface ApiSource {
  id: string;
  label: string;
  sublabel: string | null;
  url: string;
  siteUrl: string | null;
  active: boolean;
  type: string;
  group: string | null;
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

  const addSource = useCallback(async (label: string, url: string, group?: string | null, trending?: boolean): Promise<ApiSource> => {
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url, group, trending }),
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

  const updateSource = useCallback(async (id: string, label: string, url: string, group?: string | null): Promise<ApiSource> => {
    const res = await fetch(`/api/sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url, group }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Lỗi cập nhật nguồn.");
    // PUT trả raw DB row (active=0|1, không có count) → giữ count & active boolean từ state hiện tại
    // (sửa label/url/group không đổi số bài) để count không nhảy về 0 sau khi sửa.
    setState((s) => ({
      ...s,
      sources: s.sources.map((src) =>
        src.id === id ? { ...src, ...data, active: src.active, count: src.count } : src
      ),
    }));
    return { ...data, active: !!data.active };
  }, []);

  return { ...state, reload: load, addSource, deleteSource, updateSource };
}
