"use client";
import { useState } from "react";
import type { ApiSource } from "@/hooks/use-sources";
import { X, Trash2, Plus, Pencil, Check } from "lucide-react";

interface FeedManagerDialogProps {
  sources: ApiSource[];
  onAdd: (label: string, url: string, group?: string | null) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, label: string, url: string, group?: string | null) => Promise<unknown>;
  onClose: () => void;
}

export function FeedManagerDialog({ sources, onAdd, onDelete, onUpdate, onClose }: FeedManagerDialogProps) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [group, setGroup] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Danh sách folder sẵn có để gợi ý trong datalist.
  const existingGroups = Array.from(
    new Set(sources.map((s) => s.group).filter((g): g is string => !!g))
  ).sort();

  const inputStyle: React.CSSProperties = {
    height: 40,
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--background)",
    padding: "0 12px",
    fontFamily: "inherit",
    fontSize: 14,
    color: "var(--foreground)",
    width: "100%",
    outline: "none",
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd(label.trim(), url.trim(), group.trim() || null);
      setLabel("");
      setUrl("");
      setGroup("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi thêm nguồn.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try { await onDelete(id); } finally { setDeletingId(null); }
  }

  function startEdit(src: ApiSource) {
    setEditingId(src.id);
    setEditLabel(src.label);
    setEditUrl(src.url);
    setEditGroup(src.group ?? "");
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleUpdate(id: string) {
    if (!editLabel.trim() || !editUrl.trim()) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await onUpdate(id, editLabel.trim(), editUrl.trim(), editGroup.trim() || null);
      setEditingId(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Lỗi cập nhật nguồn.");
    } finally {
      setEditSaving(false);
    }
  }

  const catDots = ["#c96442", "#3d7a5e", "#2a5ca0", "#7a3d7a", "#7a6b3d"];

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", zIndex: 70 }}
      />
      <section
        style={{
          position: "fixed",
          zIndex: 80,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(520px, 93vw)",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "0 20px 52px rgba(0,0,0,.15)",
          scrollbarWidth: "thin",
        }}
      >
        <div style={{ padding: "22px 24px 26px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-display)", margin: 0 }}>
              Quản lý nguồn RSS
            </h2>
            <button
              onClick={onClose}
              aria-label="Đóng"
              style={{ marginLeft: "auto", width: 34, height: 34, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <X size={18} />
            </button>
          </div>

          {/* Source list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 22, maxHeight: "42vh", overflowY: "auto", paddingRight: 4, scrollbarWidth: "thin" }}>
            {sources.length === 0 && (
              <p style={{ color: "var(--muted-foreground)", fontSize: 13.5, padding: "14px 2px" }}>Chưa có nguồn nào.</p>
            )}
            {sources.map((src, i) => (
              <div
                key={src.id}
                style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10 }}
              >
                {editingId === src.id ? (
                  <>
                    <div style={{ display: "flex", gap: 7 }}>
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Tên nguồn"
                        style={{ ...inputStyle, height: 34, flex: 1 }}
                        disabled={editSaving}
                        autoFocus
                      />
                      <input
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="URL RSS"
                        style={{ ...inputStyle, height: 34, flex: 2 }}
                        disabled={editSaving}
                      />
                    </div>
                    <input
                      value={editGroup}
                      onChange={(e) => setEditGroup(e.target.value)}
                      placeholder="Thư mục (tuỳ chọn)"
                      list="folder-options"
                      style={{ ...inputStyle, height: 34 }}
                      disabled={editSaving}
                    />
                    {editError && <p style={{ fontSize: 12, color: "#b53333", margin: 0 }}>{editError}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleUpdate(src.id)}
                        disabled={editSaving}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, padding: "5px 12px", borderRadius: 6, background: "var(--primary)", color: "#faf9f5", border: "none", cursor: editSaving ? "not-allowed" : "pointer", opacity: editSaving ? .7 : 1 }}
                      >
                        <Check size={13} />{editSaving ? "Đang lưu…" : "Lưu"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={editSaving}
                        style={{ fontSize: 12.5, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        Hủy
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: catDots[i % catDots.length], flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{src.label}</span>
                        {src.group && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", background: "var(--muted)", padding: "1px 7px", borderRadius: 6 }}>
                            {src.group}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{src.url}</div>
                    </div>
                    <button
                      aria-label="Chỉnh sửa nguồn"
                      onClick={() => startEdit(src)}
                      style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.background = "var(--muted)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "none"; }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      aria-label="Xóa nguồn"
                      disabled={deletingId === src.id}
                      onClick={() => handleDelete(src.id)}
                      style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", opacity: deletingId === src.id ? .5 : 1, flexShrink: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#b53333"; e.currentTarget.style.background = "color-mix(in srgb, #b53333 10%, transparent)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "none"; }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add form */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Thêm nguồn mới</div>
            <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: 12 }}>
              Nhập tên hiển thị và URL feed RSS. Hệ thống sẽ tự động kiểm tra feed trước khi lưu.
            </p>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Tên nguồn (vd: VnExpress)"
                style={inputStyle}
                disabled={saving}
                required
              />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL RSS (vd: https://vnexpress.net/rss/tin-moi-nhat.rss)"
                style={inputStyle}
                disabled={saving}
                required
              />
              <input
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="Thư mục (tuỳ chọn, vd: AI)"
                list="folder-options"
                style={inputStyle}
                disabled={saving}
              />
              <datalist id="folder-options">
                {existingGroups.map((g) => <option key={g} value={g} />)}
              </datalist>
              {error && (
                <p style={{ fontSize: 13, color: "#b53333", margin: 0 }}>{error}</p>
              )}
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 2 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    background: "var(--primary)", color: "#faf9f5",
                    fontWeight: 600, fontSize: 13, padding: "9px 18px", borderRadius: 9999,
                    border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1,
                    transition: ".15s",
                  }}
                >
                  <Plus size={15} />
                  {saving ? "Đang kiểm tra…" : "Thêm nguồn"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ fontSize: 13.5, fontWeight: 500, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
