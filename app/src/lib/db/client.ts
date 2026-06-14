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

export const db = drizzle(sqlite, { schema });
export { schema };
