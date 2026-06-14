/**
 * Chuyển bản ghi `articles` trong DB thành object JSON cho frontend.
 * Parse các trường JSON (tags/points), tính thời gian tương đối, đính kèm thông tin nguồn.
 */
import type { Article, Source } from '../db/schema.js';
import { relTime } from './rel-time.js';

export interface ApiArticle {
  id: string;
  sourceId: string;
  source: string; // label nguồn
  host: string; // hostname (dùng lấy favicon ở client)
  cat: string | null;
  tags: string[];
  title: string;
  summary: string; // aiLead || rawSummary — cho list/card
  lead: string; // tóm tắt AI mở đầu
  points: string[]; // các ý chính AI
  img: string | null;
  url: string;
  time: string;
  publishedAt: number | null;
  hotScore: number;
}

function safeJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function serializeArticle(a: Article, src?: Source): ApiArticle {
  const lead = a.aiLead || '';
  return {
    id: a.id,
    sourceId: a.sourceId,
    source: src?.label || hostOf(a.url),
    host: hostOf(src?.siteUrl || a.url), // ưu tiên homepage thật → favicon đúng (feedburner…)
    cat: a.category,
    tags: safeJson<string[]>(a.tags, []),
    title: a.title,
    summary: lead || a.rawSummary || '',
    lead,
    points: safeJson<string[]>(a.aiPoints, []),
    img: a.image,
    url: a.url,
    time: relTime(a.publishedAt ?? a.fetchedAt),
    publishedAt: a.publishedAt,
    hotScore: a.hotScore,
  };
}
