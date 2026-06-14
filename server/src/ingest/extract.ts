/**
 * Trích nội dung bài gốc server-side: vừa lấy text (cho AI tóm tắt) vừa lấy
 * các "block" xen kẽ đoạn văn + ảnh (giữ ảnh trong thân bài để hiển thị như bản gốc).
 * Dùng @mozilla/readability; có fallback selector cho VnExpress. Lỗi → null, không chặn pipeline.
 */
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';

const FETCH_TIMEOUT = 20000; // trang báo có thể nặng (vd Tinh Tế ~1.7MB) → nới timeout
const MAX_BLOCKS = 40;
const MIN_PARA_LEN = 30;

export type Block = { t: 'p'; v: string } | { t: 'img'; v: string };

export interface Extracted {
  paragraphs: string[]; // chỉ đoạn văn (tương thích cũ)
  text: string; // cho AI
  blocks: Block[]; // xen kẽ p + img, đúng thứ tự
  image: string | null; // ảnh đại diện (og:image) — dùng khi RSS không kèm ảnh
}

// Ảnh đại diện bài: ưu tiên og:image / twitter:image, fallback ảnh đầu trong nội dung.
function leadImage(document: any, baseUrl: string, blocks: Block[]): string | null {
  const metas = [
    'meta[property="og:image"]',
    'meta[property="og:image:url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
  ];
  for (const sel of metas) {
    const c = document.querySelector(sel)?.getAttribute('content')?.trim();
    if (c && !c.startsWith('data:')) {
      try {
        return new URL(c, baseUrl).href;
      } catch {
        /* thử meta kế */
      }
    }
  }
  const firstImg = blocks.find((b) => b.t === 'img');
  return firstImg ? firstImg.v : null;
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

// Footer/boilerplate cuối trang (bản quyền, giấy phép, địa chỉ toà soạn…). Gặp dòng này → cắt từ đó về sau.
const FOOTER_RE =
  /^(Chịu trách nhiệm nội dung|©\s*\d{4}|Giấy phép (cung cấp|thiết lập|hoạt động)|Địa chỉ:|Số điện thoại:|MST:|Tổng biên tập|Bản quyền|All rights reserved|Liên hệ quảng cáo)/i;

function trimBoilerplate(blocks: Block[]): Block[] {
  const cut = blocks.findIndex((b) => b.t === 'p' && FOOTER_RE.test(b.v));
  return cut >= 0 ? blocks.slice(0, cut) : blocks;
}

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

// Các thẻ block-level: chạm vào là ngắt đoạn. Inline (span,b,a,em,strong…) gộp chung dòng.
const BLOCK_TAGS = new Set([
  'p', 'div', 'li', 'ul', 'ol', 'section', 'article', 'figure', 'figcaption',
  'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'header', 'footer', 'main',
]);
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'nav', 'aside']);

// Selector thân bài theo site (ưu tiên trước Readability) — chỉ chứa nội dung bài gốc.
const CONTENT_SELECTORS = [
  '.fck_detail', // VnExpress
  '.mobile-content-post-body', // Tinh Tế
  '[itemprop="articleBody"]', // schema.org chuẩn
  '.article-body',
  '.entry-content',
  '.post-content',
];

// Duyệt DOM đệ quy theo thứ tự tài liệu → gom đoạn văn + ảnh, giữ đúng vị trí.
// Tổng quát cho mọi cấu trúc: <p> (VnExpress) lẫn <span>+<br> (Tinh Tế).
function collectBlocks(root: any, baseUrl: string): Block[] {
  const blocks: Block[] = [];
  const seenP = new Set<string>();
  const seenImg = new Set<string>();
  let buf = '';

  const flush = () => {
    if (buf.trim()) {
      for (const seg of buf.split(/\n+/)) {
        const v = clean(seg);
        if (v.length >= MIN_PARA_LEN && !seenP.has(v) && blocks.length < MAX_BLOCKS) {
          seenP.add(v);
          blocks.push({ t: 'p', v });
        }
      }
    }
    buf = '';
  };

  const walk = (node: any) => {
    for (const ch of node.childNodes || []) {
      if (blocks.length >= MAX_BLOCKS) break;
      if (ch.nodeType === 3) {
        buf += ch.textContent || ''; // text node
        continue;
      }
      if (ch.nodeType !== 1) continue;
      const tag = (ch.tagName || '').toLowerCase();
      if (tag === 'br') buf += '\n';
      else if (tag === 'img') {
        flush();
        const u = imgUrl(ch, baseUrl);
        if (u && !seenImg.has(u)) {
          seenImg.add(u);
          blocks.push({ t: 'img', v: u });
        }
      } else if (SKIP_TAGS.has(tag)) {
        /* bỏ qua */
      } else if (BLOCK_TAGS.has(tag)) {
        flush();
        walk(ch);
        flush();
      } else {
        walk(ch); // inline: giữ nguyên dòng
      }
    }
  };

  walk(root);
  flush();
  return blocks;
}

export async function extractFullText(url: string): Promise<Extracted | null> {
  const html = await fetchHtml(url);
  if (!html) return null;

  try {
    const { document } = parseHTML(html);

    const pCount = (b: Block[]) => b.filter((x) => x.t === 'p').length;

    // 1) Selector thân bài theo site — chỉ ôm bài gốc (loại bình luận/footer), tin cậy hơn readability.
    let blocks: Block[] = [];
    for (const sel of CONTENT_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) {
        const b = collectBlocks(el, url);
        if (pCount(b) >= 1) {
          blocks = b;
          break;
        }
      }
    }

    // 2) Không khớp selector nào → Readability cô lập nội dung chính.
    if (pCount(blocks) === 0) {
      try {
        const article = new Readability(document as any).parse();
        if (article?.content) {
          const { document: cdoc } = parseHTML(`<body>${article.content}</body>`);
          blocks = collectBlocks(cdoc, url);
        }
      } catch {
        /* để fallback xử lý */
      }
    }

    // 3) Fallback cuối CHỈ khi vẫn rỗng: <article> thô (có thể lẫn bình luận).
    if (pCount(blocks) === 0) {
      const art = document.querySelector('article');
      if (art) blocks = collectBlocks(art, url);
    }

    blocks = trimBoilerplate(blocks);
    const paragraphs = blocks.filter((b): b is { t: 'p'; v: string } => b.t === 'p').map((b) => b.v);
    if (!paragraphs.length) return null;
    const image = leadImage(document, url, blocks);
    return { paragraphs, text: paragraphs.join('\n\n'), blocks, image };
  } catch {
    return null;
  }
}
