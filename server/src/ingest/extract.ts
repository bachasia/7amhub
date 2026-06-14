/**
 * Trích toàn văn bài gốc server-side để (a) phục vụ tab "Bài gốc" trong reader,
 * (b) cho AI tóm tắt chất lượng hơn raw_summary.
 * Dùng @mozilla/readability trên DOM của linkedom; có fallback selector cho VnExpress.
 * Mọi lỗi trả null — không chặn pipeline.
 */
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';

const FETCH_TIMEOUT = 12000;
const MAX_PARAS = 16;
const MIN_PARA_LEN = 60;

export interface Extracted {
  paragraphs: string[];
  text: string;
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

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export async function extractFullText(url: string): Promise<Extracted | null> {
  const html = await fetchHtml(url);
  if (!html) return null;

  try {
    const { document } = parseHTML(html);

    // 1) Mozilla Readability (chuẩn chung cho hầu hết báo)
    let paras: string[] = [];
    try {
      const article = new Readability(document as any).parse();
      if (article?.content) {
        const { document: cdoc } = parseHTML(`<body>${article.content}</body>`);
        paras = [...cdoc.querySelectorAll('p')].map((p) => clean(p.textContent || ''));
      }
    } catch {
      /* rơi xuống fallback */
    }

    // 2) Fallback selector (VnExpress và bố cục tương tự)
    if (paras.filter((p) => p.length >= MIN_PARA_LEN).length < 2) {
      const nodes = [...document.querySelectorAll('.fck_detail p, article p, p.Normal')];
      paras = nodes.map((n) => clean(n.textContent || ''));
    }

    const out = [...new Set(paras)].filter((t) => t.length >= MIN_PARA_LEN).slice(0, MAX_PARAS);
    if (!out.length) return null;
    return { paragraphs: out, text: out.join('\n\n') };
  } catch {
    return null;
  }
}
