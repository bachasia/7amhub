/**
 * Tải và xác thực biến môi trường một lần, dùng chung toàn server.
 * Thiếu ANTHROPIC_API_KEY không làm sập app (ingest/RSS vẫn chạy) — chỉ
 * cảnh báo và tắt phần AI để tránh crash khi chưa cấu hình key.
 */
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  ANTHROPIC_API_KEY: z.string().optional(),
  // Hỗ trợ AI endpoint custom (gateway tương thích Anthropic):
  ANTHROPIC_BASE_URL: z.string().optional(),
  ANTHROPIC_AUTH_TOKEN: z.string().optional(), // token Bearer cho gateway custom
  MODEL_FAST: z.string().default('claude-haiku-4-5-20251001'),
  MODEL_SMART: z.string().default('claude-sonnet-4-6'),
  INGEST_CRON: z.string().default('*/15 * * * *'),
  AI_WORKER_CRON: z.string().default('*/2 * * * *'),
  DIGEST_CRON: z.string().default('0 7 * * *'),
  TZ: z.string().default('Asia/Saigon'),
  DB_PATH: z.string().default('./data/7amhub.db'),
});

const parsed = schema.parse(process.env);

export const config = {
  ...parsed,
  /** Bật phần AI khi có API key HOẶC auth token cho gateway custom */
  aiEnabled: Boolean(parsed.ANTHROPIC_API_KEY || parsed.ANTHROPIC_AUTH_TOKEN),
};

if (!config.aiEnabled) {
  console.warn(
    '[config] Chưa có ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN — phần AI (phân loại/tóm tắt/digest) sẽ bị tắt.',
  );
} else if (parsed.ANTHROPIC_BASE_URL) {
  console.log(`[config] AI dùng endpoint custom: ${parsed.ANTHROPIC_BASE_URL}`);
}
