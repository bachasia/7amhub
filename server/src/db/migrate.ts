/** Áp dụng migrations trong thư mục ./drizzle vào DB SQLite. */
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from './client.js';

migrate(db, { migrationsFolder: './drizzle' });
sqlite.close();
console.log('[db] migrations applied');
