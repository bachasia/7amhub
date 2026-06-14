/** Dịch nội dung bài báo sang tiếng Việt, trả về mảng đoạn văn đã dịch. */
import { config } from "../config";
import { callJSON } from "./client";
import { z } from "zod";

const resultSchema = z.object({
  paragraphs: z.array(z.string()),
});

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    paragraphs: { type: "array", items: { type: "string" }, description: "Các đoạn văn đã dịch sang tiếng Việt" },
  },
  required: ["paragraphs"],
};

const MAX_CHARS = 8000;

export async function translateContent(paragraphs: string[]): Promise<string[]> {
  const text = paragraphs.join("\n\n").slice(0, MAX_CHARS);
  const r = await callJSON({
    model: config.MODEL_FAST,
    system: "Bạn là dịch giả chuyên nghiệp. Dịch toàn bộ nội dung sang tiếng Việt tự nhiên, giữ nguyên nghĩa, không thêm bớt thông tin. Trả về từng đoạn văn tương ứng trong mảng paragraphs.",
    user: text,
    toolName: "dich_noi_dung",
    toolDescription: "Trả về nội dung bài báo đã dịch sang tiếng Việt.",
    inputSchema: INPUT_SCHEMA,
    validator: resultSchema,
    maxTokens: 4000,
  });
  return r.paragraphs;
}
