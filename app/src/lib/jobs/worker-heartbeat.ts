/**
 * Worker writes a heartbeat timestamp to DB every INTERVAL_MS.
 * Webapp reads it via /api/health → workerAlive (true if < STALE_MS old).
 */
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";

export const HEARTBEAT_KEY = "worker.heartbeat";
const INTERVAL_MS = 60_000; // 1 min
export const STALE_MS = 3 * 60_000; // 3 min → worker considered offline

function beat() {
  db.insert(settings)
    .values({ key: HEARTBEAT_KEY, value: "alive", updatedAt: Date.now() })
    .onConflictDoUpdate({ target: settings.key, set: { value: "alive", updatedAt: Date.now() } })
    .run();
}

export function startHeartbeat() {
  beat();
  setInterval(beat, INTERVAL_MS);
}
