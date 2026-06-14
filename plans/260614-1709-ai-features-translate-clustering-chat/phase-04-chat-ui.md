---
phase: 4
title: "Chat UI"
status: pending
priority: P2
effort: "1d"
dependencies: [3]
---

# Phase 4: Chat UI

## Overview

Add a `ChatPanel` component to HubView's right column (where `TrendingPanel` lives). A toggle button switches between "Trending" and "Hỏi đáp" views. Stateless per session — no history persisted.

## Requirements

- Functional:
  - Right column toggle: "Xu hướng" ↔ "Hỏi đáp"
  - Text input + submit button (Enter or click)
  - Loading state while waiting for answer
  - Answer rendered as plain text
  - Sources rendered as clickable links (open article in ReaderModal)
  - "Hỏi đáp" fallback: empty state with prompt examples
- Non-functional:
  - No new dependencies (uses existing fetch pattern)
  - Mobile: chat panel hidden on mobile (HubView is desktop-only)
  - Accessible: input has label, loading has aria-busy

## Architecture

```
HubView (right column)
  ├── [toggle] "Xu hướng" | "Hỏi đáp"
  ├── rightTab === "trending" → <TrendingPanel />
  └── rightTab === "chat"    → <ChatPanel onOpenArticle={handleOpen} />

ChatPanel
  ├── state: question, answer, sources, loading, error
  ├── handleSubmit → POST /api/chat → update state
  ├── <textarea> + <button>
  ├── loading: spinner + "Đang tìm kiếm..."
  ├── answer: <p> block
  └── sources: list of <button> → calls onOpenArticle(article)
```

**`useChat` hook** (inline in component or separate file):
```typescript
const [state, setState] = useState<{
  loading: boolean; answer: string;
  sources: { id: string; title: string; url: string }[]; error: string;
}>({ loading: false, answer: "", sources: [], error: "" });

async function ask(question: string) {
  setState(s => ({ ...s, loading: true, error: "" }));
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setState({ loading: false, answer: data.answer, sources: data.sources, error: "" });
  } catch {
    setState(s => ({ ...s, loading: false, error: "Không thể kết nối, thử lại sau." }));
  }
}
```

## Related Code Files

- Create: `app/src/components/hub/chat-panel.tsx`
- Modify: `app/src/components/hub/hub-view.tsx` — add `rightTab` state + toggle UI
- Read: `app/src/components/hub/trending-panel.tsx` — understand current right column usage
- Read: `app/src/components/hub/hub-view.tsx` — full layout before modifying

## Implementation Steps

1. **Read** `app/src/components/hub/hub-view.tsx` (364 lines) and `trending-panel.tsx` fully before editing

2. **Read Next.js docs** in `node_modules/next/dist/docs/` for any Client Component patterns — per AGENTS.md requirement

3. **Create `app/src/components/hub/chat-panel.tsx`** (~100 lines):
   - Props: `{ onOpenArticle: (article: ApiArticle) => void }`
   - State: question input + answer + sources + loading + error
   - Empty state: 3 example questions ("Hôm nay có tin gì về công nghệ?", "Tình hình kinh tế thế giới?", "Tin nóng nhất hôm nay?")
   - On source click: `GET /api/articles/:id` → open full ApiArticle in ReaderModal
   - Show loading spinner on source button while fetching
   - Styling: match existing parchment/terracotta design tokens from hub components

4. **Modify `hub-view.tsx`** — add right panel toggle:
   ```typescript
   type RightTab = "trending" | "chat";
   const [rightTab, setRightTab] = useState<RightTab>("trending");
   ```
   - Add 2-button toggle above right column: "Xu hướng" | "Hỏi đáp"
   - Render `<TrendingPanel />` or `<ChatPanel onOpenArticle={...} />` based on `rightTab`
   - `onOpenArticle` for ChatPanel: construct minimal article object from source, call `setOpenArticle`

5. **Wire `onOpenArticle`** in hub-view: ChatPanel fetches `GET /api/articles/:id` on click → receives full `ApiArticle` → calls `setOpenArticle(article)` → ReaderModal opens normally

6. **hub-view.tsx is 364 lines** — after adding rightTab state + toggle + ChatPanel import, check if file exceeds 200 lines limit. If so, extract right-column JSX into `right-column.tsx` sub-component.

## Success Criteria

- [ ] Toggle "Xu hướng" / "Hỏi đáp" renders correct panel
- [ ] Submitting question shows loading state then answer
- [ ] Clicking a source fetches `GET /api/articles/:id` and opens full ReaderModal
- [ ] Source button shows loading spinner during fetch
- [ ] Empty state shows 3 example questions
- [ ] Rate limit error (429) shows user-friendly message
- [ ] TypeScript compiles without errors
- [ ] No layout regression on desktop HubView

## Risk Assessment

- **hub-view.tsx size**: already 364 lines — adding ~30 lines pushes past 200 limit; extract right column if needed
- **Source article fetch latency**: click → GET /api/articles/:id adds ~100ms; show spinner on button during fetch to give feedback
- **Mobile**: HubView is desktop layout — ChatPanel only visible on desktop (no change needed for FeedView)
