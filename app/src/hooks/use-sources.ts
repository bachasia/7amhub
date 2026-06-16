"use client";
import { useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";

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

const KEY = "/api/sources";

export function useSources() {
  const { data, error, isLoading, mutate } = useSWR<ApiSource[]>(KEY, fetcher, {
    dedupingInterval: 30_000,
    revalidateOnFocus: true,       // refresh on tab focus — matches current behavior
    revalidateOnReconnect: true,
  });

  const reload = useCallback(() => mutate(), [mutate]);

  const addSource = useCallback(async (
    label: string, url: string, group?: string | null, trending?: boolean
  ): Promise<ApiSource> => {
    const res = await fetch(KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url, group, trending }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Lỗi thêm nguồn.");
    // Optimistic: append to cache; server-side revalidateTag handles next GET
    await mutate((current) => [...(current ?? []), data], { revalidate: false });
    return data;
  }, [mutate]);

  const deleteSource = useCallback(async (id: string) => {
    const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Lỗi xóa nguồn.");
    await mutate((current) => (current ?? []).filter((s) => s.id !== id), { revalidate: false });
  }, [mutate]);

  const updateSource = useCallback(async (
    id: string, label: string, url: string, group?: string | null
  ): Promise<ApiSource> => {
    const res = await fetch(`/api/sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url, group }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Lỗi cập nhật nguồn.");
    // Preserve active + count from local state (PUT returns raw row without these)
    await mutate(
      (current) => (current ?? []).map((s) =>
        s.id === id ? { ...s, ...data, active: s.active, count: s.count } : s
      ),
      { revalidate: false }
    );
    return { ...data, active: !!data.active };
  }, [mutate]);

  return {
    sources: data ?? [],
    loading: isLoading,
    error: error ? String(error) : null,
    reload,
    addSource,
    deleteSource,
    updateSource,
  };
}
