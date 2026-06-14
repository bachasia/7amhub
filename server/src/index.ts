/**
 * Điểm vào server 7AM Hub.
 *  - REST API dưới /api (articles, sources, digest, trending, ops)
 *  - Phục vụ 2 frontend tĩnh: "/" = news-hub (desktop), "/mobile" = feed app
 *  - Bootstrap cron: ingest RSS, AI worker, digest 7AM; chạy ingest 1 lần khi boot
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './lib/config.js';
import { articlesRoute } from './routes/articles.js';
import { sourcesRoute } from './routes/sources.js';
import { digestRoute } from './routes/digest.js';
import { trendingRoute } from './routes/trending.js';
import { opsRoute } from './routes/ops.js';
import { seedSourcesIfEmpty } from './db/seed-sources.js';
import { runIngestOnce, startIngestCron } from './jobs/ingest-job.js';
import { startAiWorkerCron, processPending } from './jobs/ai-worker.js';
import { startDigestCron } from './jobs/digest-job.js';

const WEB_DIR = process.env.WEB_DIR ?? '../web';
const app = new Hono();

app.use('/api/*', cors());

// ----- API -----
app.route('/api/articles', articlesRoute);
app.route('/api/sources', sourcesRoute);
app.route('/api/digest', digestRoute);
app.route('/api/trending', trendingRoute);
app.route('/api', opsRoute); // /api/health, /api/refresh, /api/digest/rebuild

// ----- Frontend tĩnh -----
const page = (file: string) => async (c: any) => {
  try {
    const html = await readFile(resolve(process.cwd(), WEB_DIR, file), 'utf8');
    return c.html(html);
  } catch {
    return c.text('Frontend chưa được build vào thư mục web/.', 404);
  }
};
app.get('/', page('news-hub.html')); // desktop mặc định
app.get('/mobile', page('7am-feed-app.html')); // mobile feed
app.get('/desktop', page('news-hub.html'));
app.use('/*', serveStatic({ root: WEB_DIR })); // ảnh, asset khác

// ----- Bootstrap -----
async function bootstrap() {
  seedSourcesIfEmpty();
  startIngestCron();
  startAiWorkerCron();
  startDigestCron();
  // nạp tin ngay khi khởi động, rồi xử lý AI batch đầu
  await runIngestOnce();
  void processPending(20);
}

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`[7AM Hub] server chạy tại http://localhost:${info.port}`);
  void bootstrap();
});
