/** Cron fetch RSS định kỳ + chạy ngay khi boot. */
import cron from 'node-cron';
import { config } from '../lib/config.js';
import { ingestAll } from '../ingest/rss.js';

export async function runIngestOnce(): Promise<void> {
  try {
    const r = await ingestAll();
    console.log(`[ingest] +${r.inserted} bài mới (${r.sources} nguồn, ${r.failed} lỗi)`);
  } catch (e) {
    console.error('[ingest] lỗi:', (e as Error).message);
  }
}

export function startIngestCron(): void {
  cron.schedule(config.INGEST_CRON, runIngestOnce, { timezone: config.TZ });
  console.log(`[ingest] cron: ${config.INGEST_CRON} (${config.TZ})`);
}
