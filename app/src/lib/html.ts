/** Tiện ích xử lý HTML dùng cho parse RSS description + trích toàn văn. */
import { parseHTML } from "linkedom";

/** Xoá emoji shortcode dạng :word: khỏi text (ví dụ :thinking:, :point_right:). */
export function stripEmojiCodes(text: string): string {
  return text.replace(/:[a-z][a-z0-9_+-]*:/g, "").replace(/\s{2,}/g, " ").trim();
}

/** Bóc text thuần từ một đoạn HTML, gộp khoảng trắng thừa, xoá emoji shortcode. */
export function stripHtml(html: string): string {
  if (!html) return "";
  try {
    const { document } = parseHTML(`<body>${html}</body>`);
    const text = (document.body?.textContent || "").replace(/\s+/g, " ").trim();
    return stripEmojiCodes(text);
  } catch {
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return stripEmojiCodes(text);
  }
}

/** Lấy src của ảnh đầu tiên trong đoạn HTML (thumbnail của bài). */
export function firstImage(html: string): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}
