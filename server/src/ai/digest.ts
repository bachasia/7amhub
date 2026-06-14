/**
 * Bản tin tổng hợp "Đề xuất 7AM": lấy bài ready trong 24h, để Claude Sonnet chọn tin nóng
 * + nhóm theo danh mục, lưu vào bảng digests theo ngày (theo TZ cấu hình).
 */
import { z } from 'zod';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { articles, digests } from '../db/schema.js';
import { config } from '../lib/config.js';
import { aiReady, callJSON } from './client.js';
import { CATEGORIES } from './classify.js';
import { todayLocal } from '../lib/local-date.js';

const digestSchema = z.object({
  intro: z.string(),
  picks: z.array(z.string()).min(1).max(8),
  byCat: z.array(z.object({ cat: z.enum(CATEGORIES), ids: z.array(z.string()) })),
});
export type DigestPayload = z.infer<typeof digestSchema>;

const SYSTEM = `Bạn là tổng biên tập của bản tin "Đề xuất 7AM" tiếng Việt.
Từ danh sách tin trong 24h qua, hãy:
1. Viết "intro" 1-2 câu giới thiệu bức tranh tin tức nổi bật hôm nay.
2. Chọn "picks": 5-8 tin QUAN TRỌNG/NÓNG nhất, đa dạng danh mục, sắp theo mức độ quan trọng giảm dần.
3. "byCat": nhóm các tin đáng chú ý theo danh mục.
QUY TẮC: chỉ dùng "id" XUẤT HIỆN trong danh sách đầu vào, không bịa id mới, không bịa tin.`;

const INPUT_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string' },
    picks: { type: 'array', items: { type: 'string' }, description: 'id các tin nổi bật nhất' },
    byCat: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          cat: { type: 'string', enum: [...CATEGORIES] },
          ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['cat', 'ids'],
      },
    },
  },
  required: ['intro', 'picks', 'byCat'],
};

const DAY_MS = 24 * 3.6e6;

export async function buildDigest(date = todayLocal()): Promise<DigestPayload | null> {
  if (!aiReady()) return null;

  const since = Date.now() - DAY_MS;
  const recent = db
    .select({
      id: articles.id,
      title: articles.title,
      category: articles.category,
      tags: articles.tags,
      aiLead: articles.aiLead,
      hotScore: articles.hotScore,
    })
    .from(articles)
    .where(and(eq(articles.aiStatus, 'ready'), gte(articles.fetchedAt, since)))
    .orderBy(sql`${articles.hotScore} desc`)
    .limit(60)
    .all();

  if (!recent.length) return null;
  const valid = new Set(recent.map((r) => r.id));

  const list = recent
    .map(
      (r) =>
        `- id:${r.id} | [${r.category}] ${r.title} | ${(r.aiLead || '').slice(0, 140)}`,
    )
    .join('\n');

  const payload = await callJSON({
    model: config.MODEL_SMART,
    system: SYSTEM,
    user: `Danh sách tin 24h qua:\n${list}`,
    toolName: 'tong_hop_ban_tin',
    toolDescription: 'Trả về bản tin tổng hợp: intro, picks, nhóm theo danh mục.',
    inputSchema: INPUT_SCHEMA,
    validator: digestSchema,
    maxTokens: 1200,
  });

  // lọc id ảo (phòng model bịa) + boost hot_score cho picks
  payload.picks = payload.picks.filter((id) => valid.has(id));
  payload.byCat = payload.byCat
    .map((g) => ({ ...g, ids: g.ids.filter((id) => valid.has(id)) }))
    .filter((g) => g.ids.length);

  if (payload.picks.length) {
    for (const id of payload.picks) {
      db.update(articles)
        .set({ hotScore: sql`${articles.hotScore} + 0.5` })
        .where(eq(articles.id, id))
        .run();
    }
  }

  db.insert(digests)
    .values({ date, payload: JSON.stringify(payload), createdAt: Date.now() })
    .onConflictDoUpdate({
      target: digests.date,
      set: { payload: JSON.stringify(payload), createdAt: Date.now() },
    })
    .run();

  return payload;
}
