/** API vận hành: health, làm mới ngay (ingest + AI), build lại digest. */
import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { articles } from '../db/schema.js';
import { runIngestOnce } from '../jobs/ingest-job.js';
import { processPending, pendingCount } from '../jobs/ai-worker.js';
import { runDigestOnce } from '../jobs/digest-job.js';
import { aiReady } from '../ai/client.js';

export const opsRoute = new Hono();

opsRoute.get('/health', (c) => {
  const total = db.select({ n: sql<number>`count(*)` }).from(articles).get()?.n ?? 0;
  return c.json({ ok: true, articles: total, pending: pendingCount(), aiEnabled: aiReady() });
});

// Làm mới: fetch RSS mới rồi xử lý AI một batch ngay (cho nút "Làm mới" trên UI)
opsRoute.post('/refresh', async (c) => {
  await runIngestOnce();
  const ai = await processPending(20);
  return c.json({ ok: true, processed: ai });
});

opsRoute.post('/digest/rebuild', async (c) => {
  await runDigestOnce();
  return c.json({ ok: true });
});
