/** Cron tạo bản tin "Đề xuất 7AM" mỗi sáng 07:00 (theo TZ cấu hình). */
import cron from 'node-cron';
import { config } from '../lib/config.js';
import { aiReady } from '../ai/client.js';
import { buildDigest } from '../ai/digest.js';

export async function runDigestOnce(): Promise<void> {
  try {
    const p = await buildDigest();
    console.log(p ? `[digest] tạo bản tin: ${p.picks.length} tin nổi bật` : '[digest] bỏ qua (không đủ dữ liệu / AI tắt)');
  } catch (e) {
    console.error('[digest] lỗi:', (e as Error).message);
  }
}

export function startDigestCron(): void {
  if (!aiReady()) {
    console.warn('[digest] cron tắt (chưa có API key)');
    return;
  }
  cron.schedule(config.DIGEST_CRON, runDigestOnce, { timezone: config.TZ });
  console.log(`[digest] cron: ${config.DIGEST_CRON} (${config.TZ})`);
}
