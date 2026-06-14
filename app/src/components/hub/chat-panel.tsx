"use client";
import { useState } from "react";
import type { ApiArticle } from "@/lib/serialize";
import { Send, Loader2 } from "lucide-react";

interface ChatSource {
  id: string;
  title: string;
  url: string;
}

interface ChatState {
  loading: boolean;
  answer: string;
  sources: ChatSource[];
  error: string;
}

const EXAMPLE_QUESTIONS = [
  "Hôm nay có tin gì về công nghệ?",
  "Tình hình kinh tế thế giới?",
  "Tin nóng nhất hôm nay?",
];

interface ChatPanelProps {
  onOpenArticle: (article: ApiArticle) => void;
}

export function ChatPanel({ onOpenArticle }: ChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [state, setState] = useState<ChatState>({ loading: false, answer: "", sources: [], error: "" });

  async function ask(q: string) {
    if (!q.trim() || state.loading) return;
    setState({ loading: true, answer: "", sources: [], error: "" });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = res.status === 429 ? "Đã đạt giới hạn hỏi đáp hôm nay. Thử lại vào ngày mai."
          : res.status === 503 ? "Tính năng AI chưa sẵn sàng."
          : (data.error ?? "Không thể kết nối, thử lại sau.");
        setState({ loading: false, answer: "", sources: [], error: msg });
        return;
      }
      const data = await res.json();
      setState({ loading: false, answer: data.answer, sources: data.sources ?? [], error: "" });
    } catch {
      setState({ loading: false, answer: "", sources: [], error: "Không thể kết nối, thử lại sau." });
    }
  }

  async function openSource(src: ChatSource) {
    setFetchingId(src.id);
    try {
      const res = await fetch(`/api/articles/${src.id}`);
      if (res.ok) {
        const article: ApiArticle = await res.json();
        onOpenArticle(article);
      }
    } finally {
      setFetchingId(null);
    }
  }

  const panelStyle: React.CSSProperties = {
    height: "100%",
    background: "var(--card)",
    borderLeft: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  };

  const inputRow: React.CSSProperties = {
    display: "flex",
    gap: 8,
    padding: "14px 16px",
    borderTop: "1px solid var(--border)",
    flexShrink: 0,
  };

  return (
    <aside style={panelStyle} aria-label="Hỏi đáp tin tức">
      {/* Scrollable answer area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px 6px", scrollbarWidth: "thin" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 14, opacity: 0.7 }}>
          Hỏi đáp tin tức
        </div>

        {/* Empty state */}
        {!state.loading && !state.answer && !state.error && (
          <div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 14 }}>
              Hỏi bất cứ điều gì về tin tức hôm nay.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuestion(q); ask(q); }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    textAlign: "left",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    cursor: "pointer",
                    lineHeight: 1.4,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {state.loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 13 }} aria-busy="true">
            <Loader2 size={15} style={{ animation: "spin .8s linear infinite" }} />
            Đang tìm kiếm…
          </div>
        )}

        {/* Error */}
        {state.error && (
          <p style={{ fontSize: 13, color: "var(--destructive, #e53e3e)", lineHeight: 1.6 }}>{state.error}</p>
        )}

        {/* Answer */}
        {state.answer && (
          <div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--foreground)", marginBottom: 14 }}>
              {state.answer}
            </p>
            {state.sources.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 8, opacity: 0.7 }}>
                  Nguồn tham khảo
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {state.sources.map((src) => (
                    <button
                      key={src.id}
                      onClick={() => openSource(src)}
                      disabled={fetchingId === src.id}
                      style={{
                        padding: "7px 10px",
                        borderRadius: 8,
                        fontSize: 12.5,
                        textAlign: "left",
                        background: "var(--background)",
                        border: "1px solid var(--border)",
                        color: "var(--primary)",
                        cursor: fetchingId === src.id ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        lineHeight: 1.4,
                      }}
                    >
                      {fetchingId === src.id && <Loader2 size={12} style={{ animation: "spin .8s linear infinite", flexShrink: 0 }} />}
                      {src.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input row */}
      <div style={inputRow}>
        <label htmlFor="chat-input" style={{ display: "none" }}>Câu hỏi</label>
        <textarea
          id="chat-input"
          rows={1}
          placeholder="Hỏi về tin hôm nay…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(question); } }}
          style={{
            flex: 1,
            resize: "none",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--background)",
            padding: "8px 12px",
            fontSize: 13.5,
            fontFamily: "inherit",
            color: "var(--foreground)",
            outline: "none",
            lineHeight: 1.5,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
        <button
          onClick={() => ask(question)}
          disabled={!question.trim() || state.loading}
          aria-label="Gửi câu hỏi"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "none",
            background: "var(--primary)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            cursor: question.trim() && !state.loading ? "pointer" : "not-allowed",
            opacity: question.trim() && !state.loading ? 1 : 0.45,
            flexShrink: 0,
            alignSelf: "flex-end",
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </aside>
  );
}
