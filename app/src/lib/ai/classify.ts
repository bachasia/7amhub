/** Phân tích 1 bài bằng Claude Haiku trong duy nhất 1 lần gọi: category + tags + tóm tắt. */
import { z } from "zod";
import { config } from "../config";
import { callJSON } from "./client";

export const CATEGORIES = ["world", "tech", "ai", "science", "dev", "biz", "sports", "local"] as const;
export type Category = (typeof CATEGORIES)[number];

const resultSchema = z.object({
  category: z.enum(CATEGORIES),
  tags: z.array(z.string()).min(1).max(4),
  viTitle: z.string(),
  lead: z.string(),
  points: z.array(z.string()).max(3),
});
export type AnalyzeResult = z.infer<typeof resultSchema>;

const SYSTEM = `Bạn là biên tập viên tin tức công nghệ. Với mỗi bài, hãy:

1. Phân loại vào ĐÚNG MỘT danh mục theo thứ tự ưu tiên sau:
   - "ai": bài về mô hình AI, LLM, machine learning, AI research, AI tools (ChatGPT, Gemini, Claude, Copilot...), AI startup — ƯU TIÊN CAO NHẤT, ngay cả khi bài cũng liên quan đến dev/tech.
   - "dev": bài về lập trình, ngôn ngữ lập trình (Python, Rust, Go, JS...), framework, thư viện, open source, DevOps, CI/CD, tooling, API design, system design, GitHub, developer workflow, engineering blog, web/backend/frontend development — KHÔNG phải sản phẩm tiêu dùng.
   - "tech": bài về sản phẩm phần cứng/phần mềm thương mại (iPhone, Android, chip, console, browser, OS), cybersecurity, cloud platform (AWS, GCP, Azure) ở góc độ dịch vụ, IoT.
   - "science": bài về nghiên cứu khoa học, khám phá vũ trụ/thiên văn, y học, sinh học, vật lý, môi trường, biến đổi khí hậu.
   - "biz": bài về kinh doanh, tài chính, startup funding, IPO, M&A, thị trường chứng khoán, kinh tế vĩ mô, chiến lược doanh nghiệp.
   - "sports": bài về thể thao, bóng đá, bóng rổ, tennis, F1, Olympic, giải đấu, vận động viên, kết quả thi đấu, chuyển nhượng cầu thủ.
   - "local": bài về tin tức trong nước Việt Nam — chính trị, xã hội, pháp luật, giao thông, thiên tai, giáo dục, y tế nội địa — KHÔNG phải công nghệ hay kinh doanh.
   - "world": bài về chính trị quốc tế, địa chính trị, xung đột, ngoại giao, văn hóa xã hội toàn cầu, pháp lý quốc tế.

   Quy tắc phân biệt quan trọng:
   • Bài về GitHub Actions, Docker, Kubernetes, Terraform → "dev" (không phải "tech")
   • Bài về nghiên cứu AI/ML mới → "ai" (không phải "science")
   • Bài về doanh thu/định giá của công ty AI → "biz" (không phải "ai")
   • Bài về Apple ra iPhone mới → "tech" (không phải "biz")

2. Gắn 2-4 tag ngắn gọn (thương hiệu, công nghệ, nhân vật, chủ đề chính) — viết hoa hợp lý, không trùng lặp, không lặp lại từ trong tiêu đề.

3. Dịch tiêu đề sang tiếng Việt tự nhiên, sát nghĩa (trường "viTitle") — giữ tên riêng/thương hiệu nguyên gốc.

4. Viết tóm tắt khách quan bằng tiếng Việt: 1 câu "lead" cô đọng nêu điểm cốt lõi + tối đa 3 ý chính ngắn gọn dạng gạch đầu dòng, mỗi ý 1 câu.

Tuyệt đối KHÔNG bịa thông tin ngoài bài. Chỉ tóm tắt nội dung được cung cấp.
QUAN TRỌNG: Toàn bộ "viTitle", "lead" và "points" phải viết bằng tiếng Việt.`;

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: [...CATEGORIES], description: "Một danh mục duy nhất" },
    tags: { type: "array", items: { type: "string" }, description: "2-4 tag ngắn" },
    viTitle: { type: "string", description: "Tiêu đề dịch sang tiếng Việt" },
    lead: { type: "string", description: "Câu tóm tắt mở đầu" },
    points: { type: "array", items: { type: "string" }, description: "0-3 ý chính" },
  },
  required: ["category", "tags", "viTitle", "lead", "points"],
};

const MAX_INPUT_CHARS = 6000;

export async function analyzeArticle(input: { title: string; text: string }): Promise<AnalyzeResult> {
  const body = (input.text || "").slice(0, MAX_INPUT_CHARS);
  const user = `Tiêu đề: ${input.title}\n\nNội dung:\n${body}`;
  return callJSON({
    model: config.MODEL_FAST,
    system: SYSTEM,
    user,
    toolName: "phan_loai_tom_tat",
    toolDescription: "Trả về phân loại danh mục, tags và tóm tắt của bài báo.",
    inputSchema: INPUT_SCHEMA,
    validator: resultSchema,
    maxTokens: 700,
  });
}
