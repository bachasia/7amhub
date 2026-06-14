/**
 * Phân tích 1 bài bằng Claude Haiku trong duy nhất 1 lần gọi:
 * trả về category + tags + tóm tắt (lead + các ý chính).
 */
import { z } from 'zod';
import { config } from '../lib/config.js';
import { callJSON } from './client.js';

export const CATEGORIES = ['world', 'tech', 'science', 'news', 'biz'] as const;
export type Category = (typeof CATEGORIES)[number];

const resultSchema = z.object({
  category: z.enum(CATEGORIES),
  tags: z.array(z.string()).min(1).max(4),
  lead: z.string(),
  points: z.array(z.string()).max(3),
});
export type AnalyzeResult = z.infer<typeof resultSchema>;

const SYSTEM = `Bạn là biên tập viên tin tức tiếng Việt. Với mỗi bài, hãy:
1. Phân loại vào ĐÚNG MỘT danh mục: world (thế giới), tech (công nghệ), science (khoa học), news (thời sự trong nước), biz (kinh doanh/kinh tế).
2. Gắn 2-4 tag ngắn gọn (thương hiệu, nhân vật, chủ đề chính) — viết hoa hợp lý, không trùng lặp.
3. Viết tóm tắt khách quan bằng tiếng Việt: 1 câu "lead" mở đầu cô đọng + tối đa 3 ý chính dạng gạch đầu dòng.
Tuyệt đối KHÔNG bịa thông tin ngoài bài. Chỉ tóm tắt nội dung được cung cấp.`;

const INPUT_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: [...CATEGORIES], description: 'Một danh mục duy nhất' },
    tags: { type: 'array', items: { type: 'string' }, description: '2-4 tag ngắn' },
    lead: { type: 'string', description: 'Câu tóm tắt mở đầu' },
    points: { type: 'array', items: { type: 'string' }, description: '0-3 ý chính' },
  },
  required: ['category', 'tags', 'lead', 'points'],
};

const MAX_INPUT_CHARS = 6000;

export async function analyzeArticle(input: {
  title: string;
  text: string;
}): Promise<AnalyzeResult> {
  const body = (input.text || '').slice(0, MAX_INPUT_CHARS);
  const user = `Tiêu đề: ${input.title}\n\nNội dung:\n${body}`;
  return callJSON({
    model: config.MODEL_FAST,
    system: SYSTEM,
    user,
    toolName: 'phan_loai_tom_tat',
    toolDescription: 'Trả về phân loại danh mục, tags và tóm tắt của bài báo.',
    inputSchema: INPUT_SCHEMA,
    validator: resultSchema,
    maxTokens: 700,
  });
}
