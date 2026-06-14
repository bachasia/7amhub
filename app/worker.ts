/**
 * Worker process riêng — chạy cron jobs (ingest RSS / AI classify / digest 7AM).
 * Tách khỏi web server Next.js để tránh chèn tác vụ nặng vào request pipeline.
 * Dùng chung lib/ (db/ingest/ai) với web server qua cùng file SQLite (WAL mode).
 *
 * Dev: npm run worker (song song với next dev)
 * Prod: chạy trong container riêng, cùng volume data/ với web container.
 */
import "dotenv/config";
import { seedSourcesIfEmpty } from "./src/lib/db/seed-sources";
import { runIngestOnce, startIngestCron } from "./src/lib/jobs/ingest-job";
import { startAiWorkerCron, processPending } from "./src/lib/jobs/ai-worker";
import { startDigestCron } from "./src/lib/jobs/digest-job";
import { startHeartbeat } from "./src/lib/jobs/worker-heartbeat";

async function bootstrap() {
  seedSourcesIfEmpty();
  startHeartbeat();
  startIngestCron();
  startAiWorkerCron();
  startDigestCron();
  // nạp tin ngay khi khởi động, rồi xử lý AI batch đầu
  await runIngestOnce();
  void processPending(20);
}

console.log("[worker] khởi động…");
void bootstrap();
