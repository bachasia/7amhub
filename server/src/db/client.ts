/**
 * Khởi tạo kết nối SQLite (better-sqlite3) + Drizzle.
 * Tự tạo thư mục chứa DB nếu chưa có; bật WAL cho hiệu năng đọc/ghi đồng thời.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { config } from '../lib/config.js';
import * as schema from './schema.js';

const dir = dirname(config.DB_PATH);
if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });

export const sqlite = new Database(config.DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { schema };
