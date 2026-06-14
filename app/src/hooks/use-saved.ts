"use client";
import { useState, useEffect, useCallback } from "react";
import type { ApiArticle } from "@/lib/serialize";

interface SavedState {
  ids: Set<string>;
  articles: ApiArticle[];
  loading: boolean;
}

export function useSaved() {
  const [state, setState] = useState<SavedState>({ ids: new Set(), articles: [], loading: false });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch("/api/saved");
      if (!res.ok) return;
      const list: ApiArticle[] = await res.json();
      setState({ ids: new Set(list.map((a) => a.id)), articles: list, loading: false });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (article: ApiArticle) => {
    const isSaved = state.ids.has(article.id);
    // Optimistic update
    setState((s) => {
      const next = new Set(s.ids);
      if (isSaved) {
        next.delete(article.id);
        return { ...s, ids: next, articles: s.articles.filter((a) => a.id !== article.id) };
      } else {
        next.add(article.id);
        return { ...s, ids: next, articles: [article, ...s.articles] };
      }
    });
    try {
      if (isSaved) {
        await fetch(`/api/saved/${article.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId: article.id }),
        });
      }
    } catch {
      // Revert on failure
      load();
    }
  }, [state.ids, load]);

  return { savedIds: state.ids, savedArticles: state.articles, loading: state.loading, toggle, reload: load };
}
