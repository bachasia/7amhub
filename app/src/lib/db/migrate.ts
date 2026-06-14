/** Áp dụng migrations trong thư mục drizzle/ vào DB SQLite. */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./client";
import { resolve } from "node:path";

const migrationsFolder = resolve(process.cwd(), "drizzle");
migrate(db, { migrationsFolder });
sqlite.close();
console.log("[db] migrations applied");
