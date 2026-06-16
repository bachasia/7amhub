/**
 * Khởi tạo kết nối SQLite (better-sqlite3) + Drizzle.
 * Tự tạo thư mục chứa DB nếu chưa có; bật WAL cho hiệu năng đọc/ghi đồng thời.
 * Khai báo runtime='nodejs' ở route handlers để Next.js dùng Node runtime.
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { config } from "../config";
import * as schema from "./schema";

const dir = dirname(config.DB_PATH);
if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });

export const sqlite = new Database(config.DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("synchronous = NORMAL");    // safe with WAL; fewer fsync per transaction
sqlite.pragma("cache_size = -16000");     // 16MB page cache (negative = KiB)
sqlite.pragma("mmap_size = 30000000000"); // 30GB mmap — OS handles page eviction
sqlite.pragma("temp_store = memory");     // temp tables/indexes in RAM
sqlite.pragma("busy_timeout = 5000");     // retry 5s before SQLITE_BUSY error

export const db = drizzle(sqlite, { schema });
export { schema };
