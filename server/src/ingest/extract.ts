/**
 * Trích nội dung bài gốc server-side: vừa lấy text (cho AI tóm tắt) vừa lấy
 * các "block" xen kẽ đoạn văn + ảnh (giữ ảnh trong thân bài để hiển thị như bản gốc).
 * Dùng @mozilla/readability; có fallback selector cho VnExpress. Lỗi → null, không chặn pipeline.
 */
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';

const FETCH_TIMEOUT = 12000;
const MAX_BLOCKS = 30;
const MIN_PARA_LEN = 50;

export type Block = { t: 'p'; v: string } | { t: 'img'; v: string };

export interface Extracted {
  paragraphs: string[]; // chỉ đoạn văn (tương thích cũ)
  text: string; // cho AI
  blocks: Block[]; // xen kẽ p + img, đúng thứ tự
}

async function fetchHtml(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 7AMHubBot/1.0)' },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

// Lấy URL ảnh thật. Lazy-load (VnExpress…) đặt placeholder data: ở src, ảnh thật ở data-src.
// Duyệt qua các ứng viên, BỎ qua data:, lấy URL hợp lệ đầu tiên rồi resolve tuyệt đối.
function imgUrl(el: any, baseUrl: string): string | null {
  const candidates = [
    el.getAttribute('data-src'),
    el.getAttribute('data-original'),
    el.getAttribute('data-lazy-src'),
    el.getAttribute('src'),
    (el.getAttribute('srcset') || el.getAttribute('data-srcset') || '').split(',')[0]?.trim().split(' ')[0],
  ];
  for (const raw of candidates) {
    const v = (raw || '').trim();
    if (!v || v.startsWith('data:')) continue; // bỏ placeholder base64
    try {
      return new URL(v, baseUrl).href;
    } catch {
      /* thử ứng viên kế */
    }
  }
  return null;
}

// Duyệt 1 container theo thứ tự tài liệu, gom đoạn văn (p) + ảnh (img), khử trùng lặp.
function collectBlocks(root: any, baseUrl: string): Block[] {
  const blocks: Block[] = [];
  const seenP = new Set<string>();
  const seenImg = new Set<string>();
  for (const el of root.querySelectorAll('p, img')) {
    if (blocks.length >= MAX_BLOCKS) break;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'img') {
      const u = imgUrl(el, baseUrl);
      if (u && !seenImg.has(u)) {
        seenImg.add(u);
        blocks.push({ t: 'img', v: u });
      }
    } else {
      const v = clean(el.textContent || '');
      if (v.length >= MIN_PARA_LEN && !seenP.has(v)) {
        seenP.add(v);
        blocks.push({ t: 'p', v });
      }
    }
  }
  return blocks;
}

export async function extractFullText(url: string): Promise<Extracted | null> {
  const html = await fetchHtml(url);
  if (!html) return null;

  try {
    const { document } = parseHTML(html);

    // Ưu tiên container gốc (giữ ảnh tốt hơn): VnExpress .fck_detail / <article>.
    const original =
      document.querySelector('.fck_detail') ||
      document.querySelector('article') ||
      null;
    let blocks: Block[] = original ? collectBlocks(original, url) : [];

    // Nếu container gốc không đủ đoạn văn, dùng Readability.
    if (blocks.filter((b) => b.t === 'p').length < 2) {
      try {
        const article = new Readability(document as any).parse();
        if (article?.content) {
          const { document: cdoc } = parseHTML(`<body>${article.content}</body>`);
          const rb = collectBlocks(cdoc, url);
          if (rb.filter((b) => b.t === 'p').length >= blocks.filter((b) => b.t === 'p').length) {
            blocks = rb;
          }
        }
      } catch {
        /* giữ blocks hiện có */
      }
    }

    const paragraphs = blocks.filter((b): b is { t: 'p'; v: string } => b.t === 'p').map((b) => b.v);
    if (!paragraphs.length) return null;
    return { paragraphs, text: paragraphs.join('\n\n'), blocks };
  } catch {
    return null;
  }
}
