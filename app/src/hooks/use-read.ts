"use client";
import { useState, useEffect, useCallback } from "react";

interface ReadState {
  ids: Set<string>;
  loading: boolean;
}

export function useRead() {
  const [state, setState] = useState<ReadState>({ ids: new Set(), loading: false });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch("/api/read");
      if (!res.ok) return;
      const list: string[] = await res.json();
      setState({ ids: new Set(list), loading: false });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = useCallback(async (id: string) => {
    if (state.ids.has(id)) return;
    setState((s) => ({ ...s, ids: new Set([...s.ids, id]) }));
    try {
      await fetch("/api/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: id }),
      });
    } catch {
      // best-effort; no revert needed
    }
  }, [state.ids]);

  return { readIds: state.ids, loading: state.loading, markRead };
}
