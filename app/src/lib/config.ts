/**
 * Tải và xác thực biến môi trường một lần, dùng chung toàn app.
 * Thiếu ANTHROPIC_API_KEY không làm sập app (ingest/RSS vẫn chạy) — chỉ
 * cảnh báo và tắt phần AI để tránh crash khi chưa cấu hình key.
 */
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().optional(),
  ANTHROPIC_AUTH_TOKEN: z.string().optional(),
  MODEL_FAST: z.string().default("claude-haiku-4-5-20251001"),
  MODEL_SMART: z.string().default("claude-sonnet-4-6"),
  INGEST_CRON: z.string().default("*/15 * * * *"),
  AI_WORKER_CRON: z.string().default("*/2 * * * *"),
  DIGEST_CRON: z.string().default("0 7,18 * * *"),
  // Số bài đưa vào pool cho AI chọn digest, và trần bài mỗi nguồn để tránh
  // nguồn nhiều bài lấn át (đa dạng hóa "Đề xuất 7AM").
  DIGEST_CANDIDATES: z.coerce.number().default(60),
  DIGEST_PER_SOURCE_CAP: z.coerce.number().default(8),
  TZ: z.string().default("Asia/Saigon"),
  DB_PATH: z.string().default("./data/7amhub.db"),
});

const parsed = schema.parse(process.env);

export const config = {
  ...parsed,
  aiEnabled: Boolean(parsed.ANTHROPIC_API_KEY || parsed.ANTHROPIC_AUTH_TOKEN),
};

if (!config.aiEnabled) {
  console.warn(
    "[config] Chưa có ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN — phần AI (phân loại/tóm tắt/digest) sẽ bị tắt."
  );
} else if (parsed.ANTHROPIC_BASE_URL) {
  console.log(`[config] AI dùng endpoint custom: ${parsed.ANTHROPIC_BASE_URL}`);
}
