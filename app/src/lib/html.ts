/** Tiện ích xử lý HTML dùng cho parse RSS description + trích toàn văn. */
import { parseHTML } from "linkedom";

/** Bóc text thuần từ một đoạn HTML, gộp khoảng trắng thừa. */
export function stripHtml(html: string): string {
  if (!html) return "";
  try {
    const { document } = parseHTML(`<body>${html}</body>`);
    return (document.body?.textContent || "").replace(/\s+/g, " ").trim();
  } catch {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

/** Lấy src của ảnh đầu tiên trong đoạn HTML (thumbnail của bài). */
export function firstImage(html: string): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}
